import { headers } from "next/headers";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { players } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";
import { PlayerDraftClient } from "./draft-client";
import { redirect } from "next/navigation";

export default async function PlayerDraftPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Get the authenticated user from better-auth
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.email) {
    redirect(`/join/${sessionId}`);
  }

  // Look up the player by email + session
  const [player] = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.sessionId, sessionId),
        eq(players.email, session.user.email),
      ),
    );

  if (!player) {
    redirect(`/join/${sessionId}`);
  }

  return <PlayerDraftClient sessionId={sessionId} playerId={player.id} />;
}
