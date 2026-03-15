import { db } from "../../../../db";
import { draftSessions, players } from "../../../../db/schema";
import { desc, asc } from "drizzle-orm";
import { CreateSessionForm, SessionCard } from "./session-manager";

export default async function AdminSessionsPage() {
  const sessions = await db
    .select()
    .from(draftSessions)
    .orderBy(desc(draftSessions.createdAt));

  const sessionIds = sessions.map((s) => s.id);

  let allPlayers: (typeof players.$inferSelect)[] = [];
  if (sessionIds.length > 0) {
    allPlayers = await db
      .select()
      .from(players)
      .orderBy(asc(players.draftOrder));
  }

  const playersBySession = new Map<string, (typeof players.$inferSelect)[]>();
  for (const player of allPlayers) {
    const list = playersBySession.get(player.sessionId) || [];
    list.push(player);
    playersBySession.set(player.sessionId, list);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          Draft Sessions
        </h1>

        <CreateSessionForm />

        <div className="mt-8 space-y-4">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sessions yet. Create one above.
            </p>
          )}
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              sessionPlayers={playersBySession.get(session.id) || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
