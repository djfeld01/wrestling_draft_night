import { db } from "../db";
import { players, teamMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Resolve a player record for a given session and email.
 * Checks the player's primary email first, then team_members.
 * Returns the player record or null if not found.
 */
export async function resolvePlayerByEmail(
  sessionId: string,
  email: string,
): Promise<typeof players.$inferSelect | null> {
  const normalizedEmail = email.trim().toLowerCase();

  // Check primary email on players table
  const [directPlayer] = await db
    .select()
    .from(players)
    .where(
      and(eq(players.sessionId, sessionId), eq(players.email, normalizedEmail)),
    );

  if (directPlayer) return directPlayer;

  // Check team_members table
  const [teamMember] = await db
    .select({ playerId: teamMembers.playerId })
    .from(teamMembers)
    .where(eq(teamMembers.email, normalizedEmail));

  if (teamMember) {
    // Verify this player belongs to the requested session
    const [player] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.id, teamMember.playerId),
          eq(players.sessionId, sessionId),
        ),
      );
    return player ?? null;
  }

  return null;
}

/**
 * Find all session IDs where the given email is a team member.
 */
export async function getTeamMemberSessionIds(
  email: string,
): Promise<string[]> {
  const normalizedEmail = email.trim().toLowerCase();

  const results = await db
    .select({ playerId: teamMembers.playerId })
    .from(teamMembers)
    .where(eq(teamMembers.email, normalizedEmail));

  if (results.length === 0) return [];

  const playerIds = results.map((r) => r.playerId);
  const playerRecords = await db.select().from(players);

  return playerRecords
    .filter((p) => playerIds.includes(p.id))
    .map((p) => p.sessionId);
}
