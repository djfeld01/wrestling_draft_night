"use client";

import type { DraftStateWrestler } from "../../hooks/use-draft-events";

interface PickConfirmationProps {
  selectedWrestler: DraftStateWrestler | null;
  onConfirm: () => void;
  isPending: boolean;
  isMyTurn: boolean;
}

export function PickConfirmation({
  selectedWrestler,
  onConfirm,
  isPending,
  isMyTurn,
}: PickConfirmationProps) {
  const canConfirm = isMyTurn && selectedWrestler && !isPending;

  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      {selectedWrestler ? (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Selected</p>
          <p className="text-sm font-medium text-foreground">
            #{selectedWrestler.seed} {selectedWrestler.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedWrestler.team} · {selectedWrestler.weightClass} lbs
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">
          Select a wrestler to draft
        </p>
      )}
      <button
        onClick={onConfirm}
        disabled={!canConfirm}
        className="w-full px-4 py-2.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Confirming..." : "Confirm Pick"}
      </button>
    </div>
  );
}
