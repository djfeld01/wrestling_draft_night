import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../db";
import {
  draftSessions,
  players,
  sessionWrestlers,
  wrestlers,
  picks,
} from "../../../../../../db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ExportRow {
  "Wrestler Name": string;
  School: string;
  "Weight Class": number;
  Seed: number;
  "Tournament Points": number;
  Placement: string;
  "Drafted By": string;
  "Overall Pick": string;
}

async function getScoreboardExportData(
  sessionId: string,
  includeUndrafted: boolean,
): Promise<ExportRow[]> {
  // Get all drafted wrestlers with their player info
  const draftedRows = await db
    .select({
      wrestlerName: wrestlers.name,
      school: wrestlers.team,
      weightClass: wrestlers.weightClass,
      seed: wrestlers.seed,
      points: wrestlers.tournamentPoints,
      placement: wrestlers.tournamentRound,
      playerName: players.name,
      pickNumber: picks.pickNumber,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .innerJoin(
      sessionWrestlers,
      eq(picks.sessionWrestlerId, sessionWrestlers.id),
    )
    .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
    .where(eq(picks.sessionId, sessionId))
    .orderBy(asc(wrestlers.weightClass), asc(wrestlers.seed));

  const rows: ExportRow[] = draftedRows.map((r) => ({
    "Wrestler Name": r.wrestlerName,
    School: r.school,
    "Weight Class": r.weightClass,
    Seed: r.seed,
    "Tournament Points": r.points,
    Placement: r.placement ?? "",
    "Drafted By": r.playerName,
    "Overall Pick": `${r.pickNumber}`,
  }));

  if (includeUndrafted) {
    // Get all session wrestlers that were NOT picked
    const draftedWrestlerIds = new Set(
      draftedRows.map((r) => {
        // We need the wrestler ID — re-query or use a subquery approach
        return r.wrestlerName + r.weightClass; // temp key
      }),
    );

    const allSessionWrestlers = await db
      .select({
        wrestlerName: wrestlers.name,
        school: wrestlers.team,
        weightClass: wrestlers.weightClass,
        seed: wrestlers.seed,
        points: wrestlers.tournamentPoints,
        placement: wrestlers.tournamentRound,
        wrestlerId: wrestlers.id,
        sessionWrestlerId: sessionWrestlers.id,
      })
      .from(sessionWrestlers)
      .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
      .where(eq(sessionWrestlers.sessionId, sessionId))
      .orderBy(asc(wrestlers.weightClass), asc(wrestlers.seed));

    // Get picked sessionWrestlerIds
    const pickedSWIds = await db
      .select({ sessionWrestlerId: picks.sessionWrestlerId })
      .from(picks)
      .where(eq(picks.sessionId, sessionId));
    const pickedSet = new Set(pickedSWIds.map((p) => p.sessionWrestlerId));

    for (const sw of allSessionWrestlers) {
      if (!pickedSet.has(sw.sessionWrestlerId)) {
        rows.push({
          "Wrestler Name": sw.wrestlerName,
          School: sw.school,
          "Weight Class": sw.weightClass,
          Seed: sw.seed,
          "Tournament Points": sw.points,
          Placement: sw.placement ?? "",
          "Drafted By": "",
          "Overall Pick": "",
        });
      }
    }

    // Re-sort by weight class then seed
    rows.sort(
      (a, b) => a["Weight Class"] - b["Weight Class"] || a.Seed - b.Seed,
    );
  }

  return rows;
}

function generateCSV(data: ExportRow[]): string {
  return Papa.unparse(data);
}

function generateXLSX(data: ExportRow[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Scoreboard");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const format = request.nextUrl.searchParams.get("format");
  const includeUndrafted =
    request.nextUrl.searchParams.get("undrafted") === "true";

  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'xlsx'." },
      { status: 400 },
    );
  }

  try {
    const [session] = await db
      .select()
      .from(draftSessions)
      .where(eq(draftSessions.id, sessionId));

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    const data = await getScoreboardExportData(sessionId, includeUndrafted);
    const filename = `scoreboard-${session.name.replace(/[^a-zA-Z0-9]/g, "-")}`;

    if (format === "csv") {
      const csv = generateCSV(data);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const xlsxBuffer = generateXLSX(data);
    return new Response(new Uint8Array(xlsxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export scoreboard:", error);
    return NextResponse.json(
      { error: "Failed to export scoreboard." },
      { status: 500 },
    );
  }
}
