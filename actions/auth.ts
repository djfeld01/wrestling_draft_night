"use server";

import { db } from "../db";
import { players, draftSessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "../lib/auth";
import { headers } from "next/headers";
import { generateAuthCode } from "../lib/auth-code";

/**
 * Join a draft session and send a magic link.
 *
 * Flow:
 * 1. Validate the session exists and is in setup status
 * 2. Check if the email is already registered for this session
 * 3. If not, create a new player record
 * 4. Send a magic link via better-auth + Resend
 */
export async function joinSession(
  sessionId: string,
  email: string,
  teamName?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
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

  // Only allow joining during setup
  if (session.status !== "setup") {
    return { success: false, error: "This draft has already started." };
  }

  // Check if player already exists for this session with this email
  const [existingPlayer] = await db
    .select()
    .from(players)
    .where(
      and(eq(players.sessionId, sessionId), eq(players.email, normalizedEmail)),
    );

  if (!existingPlayer) {
    // Get current player count to determine draft order
    const sessionPlayers = await db
      .select()
      .from(players)
      .where(eq(players.sessionId, sessionId));

    const nextOrder = sessionPlayers.length + 1;
    const authCode = generateAuthCode();

    await db.insert(players).values({
      sessionId,
      name: teamName?.trim() || `Team ${nextOrder}`,
      email: normalizedEmail,
      authCode,
      draftOrder: nextOrder,
    });

    // Update session player count
    await db
      .update(draftSessions)
      .set({ playerCount: nextOrder, updatedAt: new Date() })
      .where(eq(draftSessions.id, sessionId));
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
    console.error(`[Join] signInMagicLink error:`, err);
    return {
      success: false,
      error: "Failed to send login email. Please try again.",
    };
  }

  return { success: true };
}

/**
 * Request a magic link for an existing player by email.
 * Used from the login page for returning players.
 */
export async function requestMagicLink(
  email: string,
  callbackURL?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // For organizers or returning users, send magic link directly
  // better-auth will auto-create the user if they don't exist
  try {
    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        callbackURL: callbackURL || "/",
      },
      headers: await headers(),
    });
  } catch (err) {
    console.error(`[Magic Link] Failed to send for ${normalizedEmail}`, err);
    return { success: false, error: "Failed to send login email." };
  }

  return { success: true };
}
