import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../db";
import {
  draftSessions,
  players,
  sessionWrestlers,
  wrestlers,
  picks,
} from "../../../../../../db/schema";
import { eq, asc } from "drizzle-orm";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ExportRow {
  "Player Name": string;
  "Wrestler Seed": number;
  "Wrestler Name": string;
  Team: string;
  Record: string;
  "Weight Class": number;
}

async function getExportData(sessionId: string): Promise<ExportRow[]> {
  const rows = await db
    .select({
      playerName: players.name,
      wrestlerSeed: wrestlers.seed,
      wrestlerName: wrestlers.name,
      team: wrestlers.team,
      record: wrestlers.record,
      weightClass: picks.weightClass,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .innerJoin(
      sessionWrestlers,
      eq(picks.sessionWrestlerId, sessionWrestlers.id),
    )
    .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
    .where(eq(picks.sessionId, sessionId))
    .orderBy(asc(players.name), asc(picks.weightClass));

  return rows.map((r) => ({
    "Player Name": r.playerName,
    "Wrestler Seed": r.wrestlerSeed,
    "Wrestler Name": r.wrestlerName,
    Team: r.team,
    Record: r.record,
    "Weight Class": r.weightClass,
  }));
}

function generateCSV(data: ExportRow[]): string {
  return Papa.unparse(data);
}

function generateXLSX(data: ExportRow[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Draft Results");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const format = request.nextUrl.searchParams.get("format");

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
        { error: "Draft session not found." },
        { status: 404 },
      );
    }

    if (session.status !== "completed") {
      return NextResponse.json(
        { error: "Export is only available for completed draft sessions." },
        { status: 400 },
      );
    }

    const data = await getExportData(sessionId);

    if (format === "csv") {
      const csv = generateCSV(data);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="draft-results-${sessionId}.csv"`,
        },
      });
    }

    const xlsxBuffer = generateXLSX(data);
    return new Response(new Uint8Array(xlsxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="draft-results-${sessionId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export draft results:", error);
    return NextResponse.json(
      { error: "Failed to export draft results." },
      { status: 500 },
    );
  }
}
