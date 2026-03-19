"use server";

import { db } from "../db";
import {
  wrestlers,
  scoreUploads,
  picks,
  sessionWrestlers,
  players,
} from "../db/schema";
import { eq, sql, asc, desc } from "drizzle-orm";
import type { ParsedScore } from "../lib/score-parser";

export type UploadScoresResult =
  | { success: true; updated: number; skipped: number; warnings: string[] }
  | { success: false; error: string };

export type ScoreUploadRecord = {
  id: string;
  uploadedAt: Date;
  organizerEmail: string;
  wrestlersUpdated: number;
  summary: string;
};

export type ScoreboardEntry = {
  playerId: string;
  playerName: string;
  totalPoints: number;
  rank: number;
  wrestlers: {
    wrestlerId: string;
    name: string;
    weightClass: number;
    points: number;
    seed: number;
    team: string;
    overallPick: number;
  }[];
};

export async function uploadScores(
  scores: ParsedScore[],
  organizerEmail: string,
): Promise<UploadScoresResult> {
  if (scores.length === 0) {
    return { success: false, error: "No valid scores to upload." };
  }

  const warnings: string[] = [];
  let updated = 0;
  let skipped = 0;

  // Fetch all wrestlers once for matching
  const allWrestlers = await db
    .select({ id: wrestlers.id, name: wrestlers.name })
    .from(wrestlers);

  // Build a case-insensitive lookup map
  const wrestlerMap = new Map<string, string>();
  for (const w of allWrestlers) {
    wrestlerMap.set(w.name.toLowerCase(), w.id);
  }

  // Process each score
  const updates: { id: string; points: number }[] = [];

  for (const score of scores) {
    const nameLower = score.wrestlerName.toLowerCase();
    const wrestlerId = wrestlerMap.get(nameLower);

    if (!wrestlerId) {
      warnings.push(`Wrestler "${score.wrestlerName}" not found, skipping`);
      skipped++;
      continue;
    }

    updates.push({ id: wrestlerId, points: score.points });
  }

  if (updates.length === 0) {
    return {
      success: true,
      updated: 0,
      skipped,
      warnings,
    };
  }

  // Update all matched wrestlers
  for (const u of updates) {
    await db
      .update(wrestlers)
      .set({ tournamentPoints: u.points })
      .where(eq(wrestlers.id, u.id));
  }

  updated = updates.length;

  // Create upload history record
  const summary = `Updated ${updated} wrestler(s), skipped ${skipped}`;
  await db.insert(scoreUploads).values({
    organizerEmail,
    wrestlersUpdated: updated,
    summary,
  });

  return { success: true, updated, skipped, warnings };
}

export async function getScoreHistory(): Promise<ScoreUploadRecord[]> {
  const rows = await db
    .select()
    .from(scoreUploads)
    .orderBy(desc(scoreUploads.uploadedAt));

  return rows.map((r) => ({
    id: r.id,
    uploadedAt: r.uploadedAt,
    organizerEmail: r.organizerEmail,
    wrestlersUpdated: r.wrestlersUpdated,
    summary: r.summary,
  }));
}

export async function getScoreboard(
  sessionId: string,
): Promise<ScoreboardEntry[]> {
  // Get all picks for this session with wrestler details
  const pickRows = await db
    .select({
      playerId: picks.playerId,
      playerName: players.name,
      wrestlerId: wrestlers.id,
      wrestlerName: wrestlers.name,
      weightClass: wrestlers.weightClass,
      points: wrestlers.tournamentPoints,
      seed: wrestlers.seed,
      team: wrestlers.team,
      pickNumber: picks.pickNumber,
    })
    .from(picks)
    .innerJoin(players, eq(picks.playerId, players.id))
    .innerJoin(
      sessionWrestlers,
      eq(picks.sessionWrestlerId, sessionWrestlers.id),
    )
    .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
    .where(eq(picks.sessionId, sessionId));

  // Group by player
  const playerMap = new Map<
    string,
    {
      playerName: string;
      totalPoints: number;
      wrestlers: {
        wrestlerId: string;
        name: string;
        weightClass: number;
        points: number;
        seed: number;
        team: string;
        overallPick: number;
      }[];
    }
  >();

  for (const row of pickRows) {
    let entry = playerMap.get(row.playerId);
    if (!entry) {
      entry = { playerName: row.playerName, totalPoints: 0, wrestlers: [] };
      playerMap.set(row.playerId, entry);
    }
    entry.totalPoints += row.points;
    entry.wrestlers.push({
      wrestlerId: row.wrestlerId,
      name: row.wrestlerName,
      weightClass: row.weightClass,
      points: row.points,
      seed: row.seed,
      team: row.team,
      overallPick: row.pickNumber,
    });
  }

  // Sort wrestlers by points descending within each player
  for (const entry of playerMap.values()) {
    entry.wrestlers.sort((a, b) => b.points - a.points);
  }

  // Convert to array and sort by total points descending
  const entries = Array.from(playerMap.entries()).map(([playerId, data]) => ({
    playerId,
    playerName: data.playerName,
    totalPoints: data.totalPoints,
    rank: 0,
    wrestlers: data.wrestlers,
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign ranks with ties
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].totalPoints < entries[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
}
