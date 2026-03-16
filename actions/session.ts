"use server";

import { db } from "../db";
import {
  draftSessions,
  players,
  wrestlers,
  sessionWrestlers,
} from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { generateAuthCode } from "../lib/auth-code";

async function generateUniqueAuthCodes(count: number): Promise<string[]> {
  const existingPlayers = await db
    .select({ authCode: players.authCode })
    .from(players);
  const existingCodes = new Set(existingPlayers.map((p) => p.authCode));
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code: string;
    let attempts = 0;
    do {
      code = generateAuthCode();
      attempts++;
      if (attempts > 1000) {
        throw new Error(
          "Failed to generate unique auth code after 1000 attempts",
        );
      }
    } while (existingCodes.has(code));
    existingCodes.add(code);
    codes.push(code);
  }

  return codes;
}

export type CreateSessionResult =
  | {
      success: true;
      session: typeof draftSessions.$inferSelect;
    }
  | { success: false; error: string };

export async function createSession(
  name: string,
  organizerEmail?: string,
): Promise<CreateSessionResult> {
  if (!name || name.trim().length === 0) {
    return {
      success: false,
      error: "Session name is required.",
    };
  }

  // Create the draft session with 0 players (they self-join)
  const [session] = await db
    .insert(draftSessions)
    .values({
      name: name.trim(),
      organizerEmail: organizerEmail?.trim().toLowerCase() || null,
      playerCount: 0,
      status: "setup",
    })
    .returning();

  // Copy all wrestlers into sessionWrestlers for this session
  const allWrestlers = await db.select({ id: wrestlers.id }).from(wrestlers);

  if (allWrestlers.length > 0) {
    const sessionWrestlerValues = allWrestlers.map((w) => ({
      sessionId: session.id,
      wrestlerId: w.id,
      isAvailable: true,
    }));

    await db.insert(sessionWrestlers).values(sessionWrestlerValues);
  }

  return {
    success: true,
    session,
  };
}

export type SessionTransitionResult =
  | {
      success: true;
      session: typeof draftSessions.$inferSelect;
    }
  | { success: false; error: string };

export async function startSession(
  sessionId: string,
): Promise<SessionTransitionResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found" };
  }

  // Verify status is "setup"
  if (session.status !== "setup") {
    return {
      success: false,
      error: "Draft session is not in setup status",
    };
  }

  // Verify at least 2 players exist
  const sessionPlayers = await db
    .select()
    .from(players)
    .where(eq(players.sessionId, sessionId));

  if (sessionPlayers.length < 2) {
    return {
      success: false,
      error: "At least 2 players are required to start a draft session",
    };
  }

  // Transition to "active", set currentRound to 1 and currentPickNumber to 1
  const [updatedSession] = await db
    .update(draftSessions)
    .set({
      status: "active",
      currentRound: 1,
      currentPickNumber: 1,
      updatedAt: new Date(),
    })
    .where(eq(draftSessions.id, sessionId))
    .returning();

  return { success: true, session: updatedSession };
}

export async function completeSession(
  sessionId: string,
): Promise<SessionTransitionResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found" };
  }

  // Verify status is "active"
  if (session.status !== "active") {
    return {
      success: false,
      error: "Draft session is not in active status",
    };
  }

  // Transition to "completed"
  const [updatedSession] = await db
    .update(draftSessions)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(draftSessions.id, sessionId))
    .returning();

  return { success: true, session: updatedSession };
}

export type SetDraftOrderResult =
  | { success: true }
  | { success: false; error: string };

export async function setDraftOrder(
  sessionId: string,
  order: { playerId: string; draftOrder: number }[],
): Promise<SetDraftOrderResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found" };
  }

  // Validate session is in "setup" status
  if (session.status !== "setup") {
    return {
      success: false,
      error: "Draft order can only be set during setup",
    };
  }

  // Fetch all players for this session
  const sessionPlayers = await db
    .select()
    .from(players)
    .where(eq(players.sessionId, sessionId));

  const sessionPlayerIds = new Set(sessionPlayers.map((p) => p.id));

  // Validate all players in the order belong to the session
  for (const entry of order) {
    if (!sessionPlayerIds.has(entry.playerId)) {
      return {
        success: false,
        error: `Player ${entry.playerId} does not belong to this session`,
      };
    }
  }

  // Validate order covers all players
  if (order.length !== sessionPlayers.length) {
    return {
      success: false,
      error: `Order must include all ${sessionPlayers.length} players`,
    };
  }

  // Validate draft order positions are 1 through N with no gaps or duplicates
  const positions = order.map((e) => e.draftOrder).sort((a, b) => a - b);
  const expected = Array.from(
    { length: sessionPlayers.length },
    (_, i) => i + 1,
  );

  if (JSON.stringify(positions) !== JSON.stringify(expected)) {
    return {
      success: false,
      error: `Draft order positions must be 1 through ${sessionPlayers.length} with no gaps or duplicates`,
    };
  }

  // Update each player's draftOrder
  for (const entry of order) {
    await db
      .update(players)
      .set({ draftOrder: entry.draftOrder })
      .where(
        and(eq(players.id, entry.playerId), eq(players.sessionId, sessionId)),
      );
  }

  return { success: true };
}

export type UpdatePlayerNameResult =
  | { success: true }
  | { success: false; error: string };

export type UpdatePlayerEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function updatePlayerEmail(
  playerId: string,
  email: string,
): Promise<UpdatePlayerEmailResult> {
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
  }

  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId));

  if (!player) {
    return { success: false, error: "Player not found." };
  }

  await db
    .update(players)
    .set({ email: email.trim().toLowerCase() })
    .where(eq(players.id, playerId));

  return { success: true };
}

export async function updatePlayerName(
  playerId: string,
  name: string,
): Promise<UpdatePlayerNameResult> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Player name is required." };
  }

  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId));

  if (!player) {
    return { success: false, error: "Player not found." };
  }

  await db
    .update(players)
    .set({ name: name.trim() })
    .where(eq(players.id, playerId));

  return { success: true };
}

export type AddPlayerResult =
  | { success: true }
  | { success: false; error: string };

export async function addPlayerToSession(
  sessionId: string,
  teamName: string,
  email: string,
): Promise<AddPlayerResult> {
  if (!teamName || teamName.trim().length === 0) {
    return { success: false, error: "Team name is required." };
  }
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "setup") {
    return { success: false, error: "Can only add players during setup." };
  }

  // Check for duplicate email in this session
  const [existing] = await db
    .select()
    .from(players)
    .where(
      and(eq(players.sessionId, sessionId), eq(players.email, normalizedEmail)),
    );

  if (existing) {
    return {
      success: false,
      error: "A player with that email already exists in this session.",
    };
  }

  const sessionPlayers = await db
    .select()
    .from(players)
    .where(eq(players.sessionId, sessionId));

  const nextOrder = sessionPlayers.length + 1;
  const authCode = generateAuthCode();

  await db.insert(players).values({
    sessionId,
    name: teamName.trim(),
    email: normalizedEmail,
    authCode,
    draftOrder: nextOrder,
  });

  await db
    .update(draftSessions)
    .set({ playerCount: nextOrder, updatedAt: new Date() })
    .where(eq(draftSessions.id, sessionId));

  return { success: true };
}

export type AddPlayerResult =
  | { success: true }
  | { success: false; error: string };

export async function addPlayerToSession(
  sessionId: string,
  teamName: string,
  email: string,
): Promise<AddPlayerResult> {
  if (!teamName || teamName.trim().length === 0) {
    return { success: false, error: "Team name is required." };
  }
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "setup") {
    return { success: false, error: "Can only add players during setup." };
  }

  // Check for duplicate email in this session
  const [existing] = await db
    .select()
    .from(players)
    .where(
      and(eq(players.sessionId, sessionId), eq(players.email, normalizedEmail)),
    );

  if (existing) {
    return {
      success: false,
      error: "A player with that email already exists in this session.",
    };
  }

  const sessionPlayers = await db
    .select()
    .from(players)
    .where(eq(players.sessionId, sessionId));

  const nextOrder = sessionPlayers.length + 1;
  const authCode = generateAuthCode();

  await db.insert(players).values({
    sessionId,
    name: teamName.trim(),
    email: normalizedEmail,
    authCode,
    draftOrder: nextOrder,
  });

  await db
    .update(draftSessions)
    .set({ playerCount: nextOrder, updatedAt: new Date() })
    .where(eq(draftSessions.id, sessionId));

  return { success: true };
}
