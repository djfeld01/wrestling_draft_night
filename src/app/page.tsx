import { db } from "../../db";
import { draftSessions, players, teamMembers } from "../../db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "../../lib/auth";
import Link from "next/link";
import { LogoutButton } from "../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userEmail = session?.user?.email;

  // Not logged in — show landing
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
            Wrestling Draft
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            NCAA Wrestling Draft Night
          </p>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in — find drafts where user is organizer or player
  const organizedSessions = await db
    .select()
    .from(draftSessions)
    .where(eq(draftSessions.organizerEmail, userEmail))
    .orderBy(desc(draftSessions.createdAt));

  const playerRecords = await db
    .select({ sessionId: players.sessionId })
    .from(players)
    .where(eq(players.email, userEmail));

  // Also check team_members for sessions where user is a teammate
  const teamMemberRecords = await db
    .select({ playerId: teamMembers.playerId })
    .from(teamMembers)
    .where(eq(teamMembers.email, userEmail));

  const teamMemberPlayerIds = teamMemberRecords.map((r) => r.playerId);
  let teamMemberSessionIds: string[] = [];
  if (teamMemberPlayerIds.length > 0) {
    const tmPlayers = await db
      .select({ sessionId: players.sessionId })
      .from(players)
      .where(inArray(players.id, teamMemberPlayerIds));
    teamMemberSessionIds = tmPlayers.map((p) => p.sessionId);
  }

  const playerSessionIds = [
    ...new Set([
      ...playerRecords.map((p) => p.sessionId),
      ...teamMemberSessionIds,
    ]),
  ];
  const organizedIds = new Set(organizedSessions.map((s) => s.id));

  let playingSessions: (typeof draftSessions.$inferSelect)[] = [];
  if (playerSessionIds.length > 0) {
    const allPlayingSessions = await db
      .select()
      .from(draftSessions)
      .where(inArray(draftSessions.id, playerSessionIds))
      .orderBy(desc(draftSessions.createdAt));
    // Exclude ones already shown as organized
    playingSessions = allPlayingSessions.filter((s) => !organizedIds.has(s.id));
  }

  const statusStyle: Record<string, string> = {
    setup: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    completed: "bg-accent/10 text-accent",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Wrestling Draft
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{userEmail}</span>
            <LogoutButton />
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <Link
            href="/admin/sessions"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Organize a Draft
          </Link>
        </div>

        {organizedSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Drafts You Organize
            </h2>
            <div className="space-y-2">
              {organizedSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  statusStyle={statusStyle}
                  isOrganizer
                />
              ))}
            </div>
          </div>
        )}

        {playingSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Drafts You&apos;re In
            </h2>
            <div className="space-y-2">
              {playingSessions.map((s) => (
                <SessionRow key={s.id} session={s} statusStyle={statusStyle} />
              ))}
            </div>
          </div>
        )}

        {organizedSessions.length === 0 && playingSessions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No drafts yet. Organize one or join via a link.
          </p>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  statusStyle,
  isOrganizer,
}: {
  session: typeof draftSessions.$inferSelect;
  statusStyle: Record<string, string>;
  isOrganizer?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
      <div>
        <Link
          href={`/scoreboard/${session.id}`}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          {session.name}
        </Link>
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
        {isOrganizer && (
          <>
            <Link
              href={
                session.status === "setup"
                  ? `/admin/sessions`
                  : `/draft/${session.id}/admin`
              }
              className="text-xs text-accent hover:underline"
            >
              Manage
            </Link>
            <Link
              href={`/draft/${session.id}`}
              className="text-xs text-accent hover:underline"
            >
              My Team
            </Link>
          </>
        )}
        {!isOrganizer && (
          <Link
            href={`/draft/${session.id}`}
            className="text-xs text-accent hover:underline"
          >
            My Team
          </Link>
        )}
        <Link
          href={`/draft/${session.id}/display`}
          className="text-xs text-accent hover:underline"
        >
          Display
        </Link>
      </div>
    </div>
  );
}
