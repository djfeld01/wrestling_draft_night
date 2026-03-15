"use server";

import { db } from "../db";
import { draftSessions, players, sessionWrestlers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentDraftPosition } from "../lib/draft-order";
import { makePick, type PickResult } from "./draft";

export type PreSelectionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Set a pre-selection for a player. Only allowed when it is NOT the player's turn.
 */
export async function setPreSelection(
  sessionId: string,
  playerId: string,
  sessionWrestlerId: string,
): Promise<PreSelectionResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "active") {
    return {
      success: false,
      error: "This draft session is not currently active.",
    };
  }

  // Fetch the player
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  if (!player) {
    return { success: false, error: "Player not found in this session." };
  }

  // Verify it is NOT the player's turn (pre-selection is for planning ahead)
  const draftPosition = getCurrentDraftPosition(
    session.currentPickNumber,
    session.playerCount,
  );

  if (player.draftOrder === draftPosition.draftOrderPosition) {
    return {
      success: false,
      error: "You cannot pre-select when it is your turn. Make a pick instead.",
    };
  }

  // Verify the wrestler is available
  const [sessionWrestler] = await db
    .select()
    .from(sessionWrestlers)
    .where(
      and(
        eq(sessionWrestlers.id, sessionWrestlerId),
        eq(sessionWrestlers.sessionId, sessionId),
      ),
    );

  if (!sessionWrestler) {
    return { success: false, error: "Wrestler not found in this session." };
  }

  if (!sessionWrestler.isAvailable) {
    return {
      success: false,
      error: "This wrestler has already been drafted.",
    };
  }

  // Update the player's pre-selected wrestler
  await db
    .update(players)
    .set({ preSelectedWrestlerId: sessionWrestlerId })
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  return { success: true };
}

/**
 * Clear a player's pre-selection.
 */
export async function clearPreSelection(
  sessionId: string,
  playerId: string,
): Promise<PreSelectionResult> {
  await db
    .update(players)
    .set({ preSelectedWrestlerId: null })
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  return { success: true };
}

/**
 * Confirm a pre-selection as an official pick. Only allowed when it IS the player's turn.
 */
export async function confirmPreSelection(
  sessionId: string,
  playerId: string,
): Promise<PickResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "active") {
    return {
      success: false,
      error: "This draft session is not currently active.",
    };
  }

  // Verify it IS the player's turn
  const draftPosition = getCurrentDraftPosition(
    session.currentPickNumber,
    session.playerCount,
  );

  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  if (!player) {
    return { success: false, error: "Player not found in this session." };
  }

  if (player.draftOrder !== draftPosition.draftOrderPosition) {
    return { success: false, error: "It is not your turn to pick." };
  }

  // Check if the player has a pre-selection
  if (!player.preSelectedWrestlerId) {
    return { success: false, error: "No pre-selection to confirm." };
  }

  // Verify the pre-selected wrestler is still available
  const [sessionWrestler] = await db
    .select()
    .from(sessionWrestlers)
    .where(
      and(
        eq(sessionWrestlers.id, player.preSelectedWrestlerId),
        eq(sessionWrestlers.sessionId, sessionId),
      ),
    );

  if (!sessionWrestler || !sessionWrestler.isAvailable) {
    // Clear the stale pre-selection
    await db
      .update(players)
      .set({ preSelectedWrestlerId: null })
      .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

    return {
      success: false,
      error: "Your pre-selected wrestler has been drafted by another player.",
    };
  }

  // Use makePick to run the same validation and recording logic
  const pickResult = await makePick(
    sessionId,
    playerId,
    player.preSelectedWrestlerId,
  );

  // Clear the pre-selection after attempting the pick (regardless of outcome)
  await db
    .update(players)
    .set({ preSelectedWrestlerId: null })
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  return pickResult;
}

/**
 * Invalidate pre-selections for a wrestler that was just picked.
 * Called after any successful pick to clear stale pre-selections.
 */
export async function invalidatePreSelections(
  sessionId: string,
  sessionWrestlerId: string,
): Promise<void> {
  // Find all players in this session who have this wrestler as their pre-selection
  // and clear it
  await db
    .update(players)
    .set({ preSelectedWrestlerId: null })
    .where(
      and(
        eq(players.sessionId, sessionId),
        eq(players.preSelectedWrestlerId, sessionWrestlerId),
      ),
    );
}
