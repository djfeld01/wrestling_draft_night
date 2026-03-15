"use client";

import { useMemo } from "react";
import type { DraftStateWrestler } from "../../hooks/use-draft-events";

interface WrestlerListProps {
  wrestlers: DraftStateWrestler[];
  weightClassFilter: number | "all";
  onSelect?: (sessionWrestlerId: string) => void;
  selectedId?: string | null;
  lockedWeightClasses?: Set<number>;
}

export function WrestlerList({
  wrestlers,
  weightClassFilter,
  onSelect,
  selectedId,
  lockedWeightClasses,
}: WrestlerListProps) {
  const filtered = useMemo(() => {
    return wrestlers
      .filter(
        (w) =>
          weightClassFilter === "all" || w.weightClass === weightClassFilter,
      )
      .sort((a, b) =>
        a.weightClass !== b.weightClass
          ? a.weightClass - b.weightClass
          : a.seed - b.seed,
      );
  }, [wrestlers, weightClassFilter]);

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Seed
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Team
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Record
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Wt
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-4"
                >
                  No wrestlers found
                </td>
              </tr>
            )}
            {filtered.map((w) => {
              const isUnavailable = !w.isAvailable;
              const isLocked = lockedWeightClasses?.has(w.weightClass);
              const isClickable = onSelect && !isUnavailable && !isLocked;
              const isSelected = selectedId === w.sessionWrestlerId;

              return (
                <tr
                  key={w.sessionWrestlerId}
                  onClick={
                    isClickable
                      ? () => onSelect(w.sessionWrestlerId)
                      : undefined
                  }
                  className={[
                    "border-b border-border last:border-b-0 transition-colors",
                    isUnavailable || isLocked ? "opacity-40" : "",
                    isSelected
                      ? "bg-accent/10"
                      : isClickable
                        ? "cursor-pointer hover:bg-muted"
                        : "",
                  ].join(" ")}
                >
                  <td className="py-1.5 px-3 text-muted-foreground">
                    {w.seed}
                  </td>
                  <td className="py-1.5 px-3 text-foreground">{w.name}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">
                    {w.team}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">
                    {w.record}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">
                    {w.weightClass}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
