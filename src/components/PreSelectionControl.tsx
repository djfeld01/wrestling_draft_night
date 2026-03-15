"use client";

import { useTransition, useMemo } from "react";
import type { DraftStateWrestler } from "../../hooks/use-draft-events";
import {
  setPreSelection,
  clearPreSelection,
  confirmPreSelection,
} from "../../actions/preselection";

interface PreSelectionControlProps {
  preSelectedWrestlerId: string | null;
  wrestlers: DraftStateWrestler[];
  sessionId: string;
  playerId: string;
  isMyTurn: boolean;
}

export function PreSelectionControl({
  preSelectedWrestlerId,
  wrestlers,
  sessionId,
  playerId,
  isMyTurn,
}: PreSelectionControlProps) {
  const [isPending, startTransition] = useTransition();

  const preSelectedWrestler = useMemo(
    () =>
      wrestlers.find(
        (w) => w.sessionWrestlerId === preSelectedWrestlerId && w.isAvailable,
      ) ?? null,
    [wrestlers, preSelectedWrestlerId],
  );

  function handleClear() {
    startTransition(async () => {
      await clearPreSelection(sessionId, playerId);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmPreSelection(sessionId, playerId);
    });
  }

  // When it's the player's turn and they have a valid pre-selection, show confirm
  if (isMyTurn) {
    if (!preSelectedWrestler) return null;

    return (
      <div className="border border-border rounded-lg p-3 bg-background">
        <p className="text-xs text-muted-foreground mb-1">Pre-selection</p>
        <p className="text-sm font-medium text-foreground">
          #{preSelectedWrestler.seed} {preSelectedWrestler.name}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {preSelectedWrestler.team} · {preSelectedWrestler.weightClass} lbs
        </p>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full px-4 py-2 bg-success text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Confirming..." : "Confirm Pre-selection"}
        </button>
      </div>
    );
  }

  // When it's not the player's turn, show current pre-selection with clear option
  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      <p className="text-xs text-muted-foreground mb-1">Pre-selection</p>
      {preSelectedWrestler ? (
        <>
          <p className="text-sm font-medium text-foreground">
            #{preSelectedWrestler.seed} {preSelectedWrestler.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {preSelectedWrestler.team} · {preSelectedWrestler.weightClass} lbs
          </p>
          <button
            onClick={handleClear}
            disabled={isPending}
            className="mt-2 px-3 py-1 border border-border rounded-md text-xs text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {isPending ? "Clearing..." : "Clear"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a wrestler from the list to pre-select
        </p>
      )}
    </div>
  );
}
