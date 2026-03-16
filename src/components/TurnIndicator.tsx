"use client";

import type { DraftStateTurn } from "../../hooks/use-draft-events";

interface TurnIndicatorProps {
  turn: DraftStateTurn;
  sessionStatus: string;
  isMyTurn?: boolean;
  picksUntilMyTurn?: number | null;
}

export function TurnIndicator({
  turn,
  sessionStatus,
  isMyTurn,
  picksUntilMyTurn,
}: TurnIndicatorProps) {
  if (sessionStatus === "completed") {
    return (
      <div className="border border-border rounded-lg p-3 bg-muted">
        <p className="text-sm font-medium text-muted-foreground">
          Draft complete
        </p>
      </div>
    );
  }

  if (sessionStatus === "setup") {
    return (
      <div className="border border-border rounded-lg p-3 bg-muted">
        <p className="text-sm font-medium text-muted-foreground">
          Waiting for draft to start
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-muted flex items-center justify-between">
      <div>
        {isMyTurn ? (
          <p className="text-sm font-medium text-success">Your turn</p>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {turn.currentPlayerName ?? "—"}&apos;s turn
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Round {turn.round} · Pick #{turn.pickNumber}
        </p>
      </div>
      {!isMyTurn && picksUntilMyTurn != null && picksUntilMyTurn > 0 && (
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">
            {picksUntilMyTurn}
          </p>
          <p className="text-xs text-muted-foreground">
            pick{picksUntilMyTurn === 1 ? "" : "s"} until you
          </p>
        </div>
      )}
    </div>
  );
}
