import { headers } from "next/headers";
import { auth } from "../../../../../lib/auth";
import { db } from "../../../../../db";
import { draftSessions } from "../../../../../db/schema";
import { eq } from "drizzle-orm";
import { DisplayClient } from "./display-client";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let backLink = `/draft/${sessionId}`;
  let backLabel = "Draft";

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.email) {
      const [draftSession] = await db
        .select({ organizerEmail: draftSessions.organizerEmail })
        .from(draftSessions)
        .where(eq(draftSessions.id, sessionId))
        .limit(1);

      if (draftSession?.organizerEmail === session.user.email) {
        backLink = `/draft/${sessionId}/admin`;
        backLabel = "Admin";
      }
    }
  } catch {
    // If auth fails, default to player link
  }

  return (
    <DisplayClient
      sessionId={sessionId}
      backLink={backLink}
      backLabel={backLabel}
    />
  );
}
