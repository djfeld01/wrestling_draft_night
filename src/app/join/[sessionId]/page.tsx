import { db } from "../../../../db";
import { draftSessions, players } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { JoinClient } from "./join-client";

export const dynamic = "force-dynamic";

export default async function JoinSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Fetch session and players
  const [session] = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-destructive">Session not found.</p>
      </div>
    );
  }

  const sessionPlayers = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(eq(players.sessionId, sessionId));

  return (
    <JoinClient
      sessionId={sessionId}
      sessionName={session.name}
      teams={sessionPlayers}
    />
  );
}
