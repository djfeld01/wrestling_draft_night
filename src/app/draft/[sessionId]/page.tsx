import { PlayerDraftClient } from "./draft-client";

export default async function PlayerDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ playerId?: string }>;
}) {
  const { sessionId } = await params;
  const { playerId } = await searchParams;

  if (!playerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-foreground mb-1">Missing player ID</p>
          <p className="text-xs text-muted-foreground">
            Add{" "}
            <code className="bg-muted px-1 py-0.5 rounded">?playerId=xxx</code>{" "}
            to the URL
          </p>
        </div>
      </div>
    );
  }

  return <PlayerDraftClient sessionId={sessionId} playerId={playerId} />;
}
