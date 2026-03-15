"use server";

import { db } from "../db";
import {
  draftSessions,
  players,
  sessionWrestlers,
  wrestlers,
  picks,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentDraftPosition, getTotalPicks } from "../lib/draft-order";
import { completeSession } from "./session";
import { broadcastEvent } from "../lib/event-bus";

export type PickResult =
  | { success: true; pick: typeof picks.$inferSelect }
  | { success: false; error: string };

export type UndoResult =
  | {
      success: true;
      undonePickId: string;
      wrestlerId: string;
      playerId: string;
    }
  | { success: false; error: string };

export type ReassignResult =
  | {
      success: true;
      pickId: string;
      oldWrestlerId: string;
      newWrestlerId: string;
    }
  | { success: false; error: string };

export async function makePick(
  sessionId: string,
  playerId: string,
  sessionWrestlerId: string,
): Promise<PickResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  // Verify session is active
  if (session.status !== "active") {
    return {
      success: false,
      error: "This draft session is not currently active.",
    };
  }

  // Determine whose turn it is
  const draftPosition = getCurrentDraftPosition(
    session.currentPickNumber,
    session.playerCount,
  );

  // Fetch the player making the pick
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  if (!player) {
    return { success: false, error: "Player not found in this session." };
  }

  // Verify it's this player's turn
  if (player.draftOrder !== draftPosition.draftOrderPosition) {
    return { success: false, error: "It is not your turn to pick." };
  }

  // Fetch the session wrestler record
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

  // Verify wrestler is available
  if (!sessionWrestler.isAvailable) {
    return {
      success: false,
      error: "This wrestler has already been drafted.",
    };
  }

  // Get the wrestler's weight class from the master wrestlers table
  const [wrestler] = await db
    .select()
    .from(wrestlers)
    .where(eq(wrestlers.id, sessionWrestler.wrestlerId));

  if (!wrestler) {
    return { success: false, error: "Wrestler data not found." };
  }

  // Check if the player has already picked from this weight class
  const existingWeightClassPick = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.sessionId, sessionId),
        eq(picks.playerId, playerId),
        eq(picks.weightClass, wrestler.weightClass),
      ),
    );

  if (existingWeightClassPick.length > 0) {
    return {
      success: false,
      error: "You have already drafted a wrestler from this weight class.",
    };
  }

  // Record the pick
  const [pick] = await db
    .insert(picks)
    .values({
      sessionId,
      playerId,
      sessionWrestlerId,
      round: draftPosition.round,
      pickNumber: session.currentPickNumber,
      weightClass: wrestler.weightClass,
    })
    .returning();

  // Mark wrestler as unavailable
  await db
    .update(sessionWrestlers)
    .set({ isAvailable: false })
    .where(eq(sessionWrestlers.id, sessionWrestlerId));

  // Invalidate any pre-selections for this wrestler
  await db
    .update(players)
    .set({ preSelectedWrestlerId: null })
    .where(
      and(
        eq(players.sessionId, sessionId),
        eq(players.preSelectedWrestlerId, sessionWrestlerId),
      ),
    );

  // Advance pick number
  const nextPickNumber = session.currentPickNumber + 1;
  const totalPicks = getTotalPicks(session.playerCount);

  if (nextPickNumber > totalPicks) {
    // All picks are done — complete the session
    await db
      .update(draftSessions)
      .set({
        currentPickNumber: session.currentPickNumber,
        updatedAt: new Date(),
      })
      .where(eq(draftSessions.id, sessionId));

    await completeSession(sessionId);
  } else {
    // Advance to next pick
    const nextPosition = getCurrentDraftPosition(
      nextPickNumber,
      session.playerCount,
    );

    await db
      .update(draftSessions)
      .set({
        currentPickNumber: nextPickNumber,
        currentRound: nextPosition.round,
        updatedAt: new Date(),
      })
      .where(eq(draftSessions.id, sessionId));
  }

  // Broadcast SSE events
  broadcastEvent(sessionId, "pick_made", {
    pickId: pick.id,
    playerId,
    wrestlerId: sessionWrestlerId,
    weightClass: wrestler.weightClass,
    round: draftPosition.round,
    pickNumber: session.currentPickNumber,
  });

  if (nextPickNumber <= totalPicks) {
    const nextPos = getCurrentDraftPosition(
      nextPickNumber,
      session.playerCount,
    );
    // Find the player whose turn it is next
    const [nextPlayer] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.sessionId, sessionId),
          eq(players.draftOrder, nextPos.draftOrderPosition),
        ),
      );
    if (nextPlayer) {
      broadcastEvent(sessionId, "turn_changed", {
        playerId: nextPlayer.id,
        round: nextPos.round,
        pickNumber: nextPickNumber,
      });
    }
  } else {
    broadcastEvent(sessionId, "draft_completed", { sessionId });
  }

  return { success: true, pick };
}

/**
 * Make a proxy pick on behalf of the current player.
 * The organizer selects a wrestler, and the pick is recorded
 * as if the current-turn player made it directly.
 */
export async function makeProxyPick(
  sessionId: string,
  sessionWrestlerId: string,
): Promise<PickResult> {
  // Fetch the session to determine whose turn it is
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

  // Determine the current player from the draft position
  const draftPosition = getCurrentDraftPosition(
    session.currentPickNumber,
    session.playerCount,
  );

  const [currentPlayer] = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.sessionId, sessionId),
        eq(players.draftOrder, draftPosition.draftOrderPosition),
      ),
    );

  if (!currentPlayer) {
    return { success: false, error: "Current player not found." };
  }

  // Delegate to makePick with the resolved player ID
  return makePick(sessionId, currentPlayer.id, sessionWrestlerId);
}

/**
 * Undo the most recent pick in a draft session.
 * Marks the wrestler as available again, removes the pick record,
 * and reverts the session's current pick number and round.
 */
export async function undoLastPick(sessionId: string): Promise<UndoResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "active" && session.status !== "completed") {
    return {
      success: false,
      error: "This draft session is not currently active.",
    };
  }

  // Find the most recent pick (highest pickNumber)
  const [lastPick] = await db
    .select()
    .from(picks)
    .where(eq(picks.sessionId, sessionId))
    .orderBy(desc(picks.pickNumber))
    .limit(1);

  if (!lastPick) {
    return { success: false, error: "There are no picks to undo." };
  }

  // Mark the wrestler as available again
  await db
    .update(sessionWrestlers)
    .set({ isAvailable: true })
    .where(eq(sessionWrestlers.id, lastPick.sessionWrestlerId));

  // Delete the pick record
  await db.delete(picks).where(eq(picks.id, lastPick.id));

  // Revert the session's pick number and round to the undone pick's position
  const revertedPosition = getCurrentDraftPosition(
    lastPick.pickNumber,
    session.playerCount,
  );

  // If session was completed, revert to active
  const newStatus =
    session.status === "completed" ? ("active" as const) : session.status;

  await db
    .update(draftSessions)
    .set({
      currentPickNumber: lastPick.pickNumber,
      currentRound: revertedPosition.round,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(draftSessions.id, sessionId));

  // Broadcast SSE events
  broadcastEvent(sessionId, "pick_undone", {
    pickId: lastPick.id,
    wrestlerId: lastPick.sessionWrestlerId,
    playerId: lastPick.playerId,
  });

  // Find the player whose turn it now is (the one whose pick was undone)
  const [revertedPlayer] = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.sessionId, sessionId),
        eq(players.draftOrder, revertedPosition.draftOrderPosition),
      ),
    );

  if (revertedPlayer) {
    broadcastEvent(sessionId, "turn_changed", {
      playerId: revertedPlayer.id,
      round: revertedPosition.round,
      pickNumber: lastPick.pickNumber,
    });
  }

  return {
    success: true,
    undonePickId: lastPick.id,
    wrestlerId: lastPick.sessionWrestlerId,
    playerId: lastPick.playerId,
  };
}

/**
 * Reassign a pick to a different wrestler within the same weight class.
 * The old wrestler becomes available, the new wrestler becomes unavailable,
 * and the pick record is updated.
 */
export async function reassignPick(
  sessionId: string,
  pickId: string,
  newSessionWrestlerId: string,
): Promise<ReassignResult> {
  // Fetch the session
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  // Fetch the existing pick
  const [existingPick] = await db
    .select()
    .from(picks)
    .where(and(eq(picks.id, pickId), eq(picks.sessionId, sessionId)));

  if (!existingPick) {
    return { success: false, error: "Pick not found." };
  }

  // Fetch the new session wrestler
  const [newSessionWrestler] = await db
    .select()
    .from(sessionWrestlers)
    .where(
      and(
        eq(sessionWrestlers.id, newSessionWrestlerId),
        eq(sessionWrestlers.sessionId, sessionId),
      ),
    );

  if (!newSessionWrestler) {
    return { success: false, error: "Wrestler not found in this session." };
  }

  // Verify the new wrestler is available
  if (!newSessionWrestler.isAvailable) {
    return {
      success: false,
      error: "The replacement wrestler has already been drafted.",
    };
  }

  // Get the new wrestler's weight class
  const [newWrestler] = await db
    .select()
    .from(wrestlers)
    .where(eq(wrestlers.id, newSessionWrestler.wrestlerId));

  if (!newWrestler) {
    return { success: false, error: "Wrestler data not found." };
  }

  // Validate same weight class
  if (newWrestler.weightClass !== existingPick.weightClass) {
    return {
      success: false,
      error: "Replacement wrestler must be from the same weight class.",
    };
  }

  const oldSessionWrestlerId = existingPick.sessionWrestlerId;

  // Mark old wrestler as available
  await db
    .update(sessionWrestlers)
    .set({ isAvailable: true })
    .where(eq(sessionWrestlers.id, oldSessionWrestlerId));

  // Mark new wrestler as unavailable
  await db
    .update(sessionWrestlers)
    .set({ isAvailable: false })
    .where(eq(sessionWrestlers.id, newSessionWrestlerId));

  // Update the pick record
  await db
    .update(picks)
    .set({ sessionWrestlerId: newSessionWrestlerId })
    .where(eq(picks.id, pickId));

  // Broadcast SSE event
  broadcastEvent(sessionId, "pick_reassigned", {
    pickId,
    oldWrestlerId: oldSessionWrestlerId,
    newWrestlerId: newSessionWrestlerId,
  });

  return {
    success: true,
    pickId,
    oldWrestlerId: oldSessionWrestlerId,
    newWrestlerId: newSessionWrestlerId,
  };
}
