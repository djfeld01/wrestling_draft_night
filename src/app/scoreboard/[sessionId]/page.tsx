import { getScoreboard } from "../../../../actions/scores";
import { db } from "../../../../db";
import { draftSessions } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ScoreboardClient } from "./scoreboard-client";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [session] = await db
    .select({ id: draftSessions.id, name: draftSessions.name })
    .from(draftSessions)
    .where(eq(draftSessions.id, sessionId));

  if (!session) notFound();

  const entries = await getScoreboard(sessionId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-foreground">
            {session.name}
          </h1>
          <a
            href="/admin/scores"
            className="text-xs text-accent hover:underline"
          >
            Manage Scores
          </a>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Scoreboard</p>
        <ScoreboardClient entries={entries} sessionId={sessionId} />
      </div>
    </div>
  );
}
