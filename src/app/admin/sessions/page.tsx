import { db } from "../../../../db";
import { draftSessions, players } from "../../../../db/schema";
import { desc, asc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { CreateSessionForm, SessionCard } from "./session-manager";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin/sessions");
  }

  const userEmail = session.user.email;

  // Show sessions where user is the organizer
  const sessions = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.organizerEmail, userEmail))
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            My Draft Sessions
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/admin/scores"
              className="text-xs text-accent hover:underline"
            >
              Manage Scores
            </a>
            <span className="text-xs text-muted-foreground">{userEmail}</span>
          </div>
        </div>

        <CreateSessionForm organizerEmail={userEmail} />

        <div className="mt-8 space-y-4">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sessions yet. Create one above.
            </p>
          )}
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              sessionPlayers={playersBySession.get(s.id) || []}
              organizerEmail={userEmail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
