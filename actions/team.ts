"use server";

import { db } from "../db";
import { players, teamMembers, draftSessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "../lib/auth";
import { headers } from "next/headers";

export type JoinTeamResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Join an existing team as a teammate.
 * The user provides the player ID (team) and the session ID.
 * A magic link is sent to the joining user's email.
 */
export async function joinTeam(
  sessionId: string,
  email: string,
  playerId: string,
): Promise<JoinTeamResult> {
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Your email is required." };
  }
  if (!playerId || playerId.trim().length === 0) {
    return { success: false, error: "Please select a team." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verify session exists
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return { success: false, error: "Draft session not found." };
  }

  if (session.status !== "setup") {
    return { success: false, error: "This draft has already started." };
  }

  // Find the team owner's player record
  const [ownerPlayer] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.sessionId, sessionId)));

  if (!ownerPlayer) {
    return {
      success: false,
      error: "Team not found in this session.",
    };
  }

  // Check if the joining email matches the team owner
  if (ownerPlayer.email === normalizedEmail) {
    return { success: false, error: "You can't join your own team." };
  }

  // Check if this email is already the primary player in this session
  const [existingPlayer] = await db
    .select()
    .from(players)
    .where(
      and(eq(players.sessionId, sessionId), eq(players.email, normalizedEmail)),
    );

  if (existingPlayer) {
    return {
      success: false,
      error: "You already have your own team in this session.",
    };
  }

  // Check if already a team member for this player
  const existingMembers = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, ownerPlayer.id),
        eq(teamMembers.email, normalizedEmail),
      ),
    );

  if (existingMembers.length === 0) {
    await db.insert(teamMembers).values({
      playerId: ownerPlayer.id,
      email: normalizedEmail,
    });
  }

  // Send magic link
  try {
    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        callbackURL: `/draft/${sessionId}`,
      },
      headers: await headers(),
    });
  } catch (err) {
    console.error(`[JoinTeam] signInMagicLink error:`, err);
    return {
      success: false,
      error: "Failed to send login email. Please try again.",
    };
  }

  return { success: true };
}

/**
 * Get team members for a player.
 */
export async function getTeamMembers(
  playerId: string,
): Promise<{ email: string }[]> {
  const members = await db
    .select({ email: teamMembers.email })
    .from(teamMembers)
    .where(eq(teamMembers.playerId, playerId));

  return members;
}
