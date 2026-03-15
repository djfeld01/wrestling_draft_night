import { db } from "../../db";
import { draftSessions } from "../../db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function Home() {
  const sessions = await db
    .select()
    .from(draftSessions)
    .orderBy(desc(draftSessions.createdAt));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
          Wrestling Draft
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          NCAA Wrestling Draft Night
        </p>

        <div className="flex justify-center gap-3 mb-10">
          <Link
            href="/login"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Player Login
          </Link>
          <Link
            href="/admin/sessions"
            className="px-4 py-2 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
          >
            Organizer
          </Link>
        </div>

        {sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Sessions
            </h2>
            <div className="space-y-2">
              {sessions.map((session) => {
                const statusStyle: Record<string, string> = {
                  setup: "bg-muted text-muted-foreground",
                  active: "bg-success/10 text-success",
                  completed: "bg-accent/10 text-accent",
                };
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between border border-border rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.playerCount} players
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusStyle[session.status] || statusStyle.setup}`}
                      >
                        {session.status}
                      </span>
                      {session.status === "active" && (
                        <Link
                          href={`/draft/${session.id}/display`}
                          className="text-xs text-accent hover:underline"
                        >
                          Display
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
