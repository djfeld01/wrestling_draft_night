"use client";

import { useMemo } from "react";
import type { DraftStatePick } from "../../hooks/use-draft-events";

interface PickHistoryProps {
  picks: DraftStatePick[];
}

export function PickHistory({ picks }: PickHistoryProps) {
  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => b.pickNumber - a.pickNumber),
    [picks],
  );

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Pick History</h2>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                #
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Player
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Wrestler
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Wt
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Rd
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPicks.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-4"
                >
                  No picks yet
                </td>
              </tr>
            )}
            {sortedPicks.map((pick) => (
              <tr
                key={pick.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-1.5 px-3 text-muted-foreground">
                  {pick.pickNumber}
                </td>
                <td className="py-1.5 px-3 text-foreground">
                  {pick.playerName}
                </td>
                <td className="py-1.5 px-3 text-foreground">
                  {pick.wrestlerName}
                </td>
                <td className="py-1.5 px-3 text-muted-foreground">
                  {pick.weightClass}
                </td>
                <td className="py-1.5 px-3 text-muted-foreground">
                  {pick.round}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
