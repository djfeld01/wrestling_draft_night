"use server";

import { db } from "../db";
import { players } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { headers } from "next/headers";

/**
 * Request a magic link for a player by email.
 *
 * Looks up the player by email, then uses better-auth's magic link
 * plugin to send a login link via Resend.
 */
export async function requestMagicLink(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || email.trim().length === 0) {
    return { success: false, error: "Email is required." };
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

  try {
    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        callbackURL: `/draft/${player.sessionId}`,
      },
      headers: await headers(),
    });
  } catch {
    console.error(`[Magic Link] Failed to send for ${normalizedEmail}`);
  }

  return { success: true };
}
