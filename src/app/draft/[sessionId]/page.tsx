import { headers } from "next/headers";
import { auth } from "../../../../lib/auth";
import { resolvePlayerByEmail } from "../../../../lib/resolve-player";
import { PlayerDraftClient } from "./draft-client";
import { redirect } from "next/navigation";

export default async function PlayerDraftPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.email) {
    redirect(`/join/${sessionId}`);
  }

  const player = await resolvePlayerByEmail(sessionId, session.user.email);

  if (!player) {
    redirect(`/join/${sessionId}`);
  }

  return <PlayerDraftClient sessionId={sessionId} playerId={player.id} />;
}
