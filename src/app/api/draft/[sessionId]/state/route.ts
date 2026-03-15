import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../db";
import {
  draftSessions,
  players,
  sessionWrestlers,
  wrestlers,
  picks,
} from "../../../../../../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentDraftPosition } from "../../../../../../lib/draft-order";

export interface DraftStatePlayer {
  id: string;
  name: string;
  draftOrder: number;
  preSelectedWrestlerId: string | null;
}

export interface DraftStateWrestler {
  sessionWrestlerId: string;
  wrestlerId: string;
  name: string;
  team: string;
  record: string;
  seed: number;
  weightClass: number;
  grade: string | null;
  scoring: string | null;
  isAvailable: boolean;
}

export interface DraftStatePick {
  id: string;
  playerId: string;
  playerName: string;
  sessionWrestlerId: string;
  wrestlerName: string;
  wrestlerSeed: number;
  wrestlerTeam: string;
  weightClass: number;
  round: number;
  pickNumber: number;
  createdAt: string;
}

export interface DraftStateTurn {
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  round: number;
  pickNumber: number;
  draftOrderPosition: number;
}

export interface DraftState {
  session: {
    id: string;
    name: string;
    status: "setup" | "active" | "completed";
    playerCount: number;
    currentRound: number;
    currentPickNumber: number;
  };
  players: DraftStatePlayer[];
  wrestlers: DraftStateWrestler[];
  picks: DraftStatePick[];
  turn: DraftStateTurn;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  try {
    // Fetch session
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

    // Fetch players
    const sessionPlayers = await db
      .select()
      .from(players)
      .where(eq(players.sessionId, sessionId))
      .orderBy(asc(players.draftOrder));

    // Fetch wrestlers with details (join sessionWrestlers with wrestlers)
    const wrestlerRows = await db
      .select({
        sessionWrestlerId: sessionWrestlers.id,
        wrestlerId: sessionWrestlers.wrestlerId,
        isAvailable: sessionWrestlers.isAvailable,
        name: wrestlers.name,
        team: wrestlers.team,
        record: wrestlers.record,
        seed: wrestlers.seed,
        weightClass: wrestlers.weightClass,
        grade: wrestlers.grade,
        scoring: wrestlers.scoring,
      })
      .from(sessionWrestlers)
      .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
      .where(eq(sessionWrestlers.sessionId, sessionId))
      .orderBy(asc(wrestlers.weightClass), asc(wrestlers.seed));

    // Fetch picks with player and wrestler details
    const pickRows = await db
      .select({
        id: picks.id,
        playerId: picks.playerId,
        sessionWrestlerId: picks.sessionWrestlerId,
        weightClass: picks.weightClass,
        round: picks.round,
        pickNumber: picks.pickNumber,
        createdAt: picks.createdAt,
        playerName: players.name,
        wrestlerName: wrestlers.name,
        wrestlerSeed: wrestlers.seed,
        wrestlerTeam: wrestlers.team,
      })
      .from(picks)
      .innerJoin(players, eq(picks.playerId, players.id))
      .innerJoin(
        sessionWrestlers,
        eq(picks.sessionWrestlerId, sessionWrestlers.id),
      )
      .innerJoin(wrestlers, eq(sessionWrestlers.wrestlerId, wrestlers.id))
      .where(eq(picks.sessionId, sessionId))
      .orderBy(asc(picks.pickNumber));

    // Calculate current turn
    const draftPosition = getCurrentDraftPosition(
      session.currentPickNumber,
      session.playerCount,
    );

    const currentPlayer = sessionPlayers.find(
      (p) => p.draftOrder === draftPosition.draftOrderPosition,
    );

    const state: DraftState = {
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        playerCount: session.playerCount,
        currentRound: session.currentRound,
        currentPickNumber: session.currentPickNumber,
      },
      players: sessionPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        draftOrder: p.draftOrder,
        preSelectedWrestlerId: p.preSelectedWrestlerId,
      })),
      wrestlers: wrestlerRows.map((w) => ({
        sessionWrestlerId: w.sessionWrestlerId,
        wrestlerId: w.wrestlerId,
        name: w.name,
        team: w.team,
        record: w.record,
        seed: w.seed,
        weightClass: w.weightClass,
        grade: w.grade,
        scoring: w.scoring,
        isAvailable: w.isAvailable,
      })),
      picks: pickRows.map((p) => ({
        id: p.id,
        playerId: p.playerId,
        playerName: p.playerName,
        sessionWrestlerId: p.sessionWrestlerId,
        wrestlerName: p.wrestlerName,
        wrestlerSeed: p.wrestlerSeed,
        wrestlerTeam: p.wrestlerTeam,
        weightClass: p.weightClass,
        round: p.round,
        pickNumber: p.pickNumber,
        createdAt: p.createdAt.toISOString(),
      })),
      turn: {
        currentPlayerId: currentPlayer?.id ?? null,
        currentPlayerName: currentPlayer?.name ?? null,
        round: draftPosition.round,
        pickNumber: session.currentPickNumber,
        draftOrderPosition: draftPosition.draftOrderPosition,
      },
    };

    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to fetch draft state:", error);
    return NextResponse.json(
      { error: "Failed to fetch draft state." },
      { status: 500 },
    );
  }
}
