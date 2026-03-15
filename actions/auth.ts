"use server";

import { db } from "../db";
import { players, draftSessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { headers } from "next/headers";

export type AuthResult =
  | {
      success: true;
      playerId: string;
      sessionId: string;
      playerName: string;
    }
  | { success: false; error: string };

/**
 * Authenticate a player using their auth code.
 *
 * Flow:
 * 1. Look up the auth code in the players table
 * 2. Sign up or sign in the player in better-auth using their player ID as email
 *    and the auth code as password
 * 3. Return the player/session info
 */
export async function loginWithAuthCode(code: string): Promise<AuthResult> {
  if (!code || code.trim().length === 0) {
    return {
      success: false,
      error: "Auth code is required.",
    };
  }

  const normalizedCode = code.trim().toUpperCase();

  // Look up the player by auth code
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.authCode, normalizedCode));

  if (!player) {
    return {
      success: false,
      error: "Invalid auth code. Please check your code and try again.",
    };
  }

  // Use a deterministic email derived from the player ID for better-auth
  const syntheticEmail = `${player.id}@draft.local`;
  const password = normalizedCode;

  // Try to sign in first, if that fails, sign up then sign in
  try {
    // Attempt sign-in
    const signInRes = await auth.api.signInEmail({
      body: {
        email: syntheticEmail,
        password,
      },
      headers: await headers(),
    });

    if (signInRes?.token) {
      return {
        success: true,
        playerId: player.id,
        sessionId: player.sessionId,
        playerName: player.name,
      };
    }
  } catch {
    // Sign-in failed — user may not exist in better-auth yet, try sign-up
  }

  try {
    const signUpRes = await auth.api.signUpEmail({
      body: {
        email: syntheticEmail,
        password,
        name: player.name,
      },
      headers: await headers(),
    });

    if (signUpRes?.token) {
      return {
        success: true,
        playerId: player.id,
        sessionId: player.sessionId,
        playerName: player.name,
      };
    }
  } catch {
    // Sign-up may fail if user already exists with different password
    // This shouldn't happen in normal flow
  }

  return {
    success: false,
    error: "Authentication failed. Please try again.",
  };
}

/**
 * Request a magic link for a player by email.
 *
 * Flow:
 * 1. Look up the player by email
 * 2. Use better-auth's magic link plugin to send a login link
 */
export async function requestMagicLink(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || email.trim().length === 0) {
    return {
      success: false,
      error: "Email is required.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Look up the player by email
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.email, normalizedEmail));

  if (!player) {
    // Don't reveal whether the email exists — return success either way
    return { success: true };
  }

  // Use the synthetic email for better-auth's magic link
  const syntheticEmail = `${player.id}@draft.local`;

  try {
    await auth.api.signInMagicLink({
      body: {
        email: syntheticEmail,
        callbackURL: `/draft/${player.sessionId}`,
      },
      headers: await headers(),
    });
  } catch {
    // Silently handle errors to avoid leaking info
    console.error(
      `[Magic Link] Failed to send magic link for ${normalizedEmail}`,
    );
  }

  return { success: true };
}
