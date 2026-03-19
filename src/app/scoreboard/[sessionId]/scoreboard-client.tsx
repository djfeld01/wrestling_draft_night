"use client";

import { useState } from "react";
import type { ScoreboardEntry } from "../../../../actions/scores";

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-yellow-500/20 text-yellow-600"
      : rank === 2
        ? "bg-gray-300/20 text-gray-500"
        : rank === 3
          ? "bg-orange-400/20 text-orange-500"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${styles}`}
    >
      {rank}
    </span>
  );
}

export function ScoreboardClient({ entries }: { entries: ScoreboardEntry[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(playerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6 bg-muted text-center">
        <p className="text-sm text-muted-foreground">No scores to show yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      {entries.map((entry) => {
        const isExpanded = expanded.has(entry.playerId);
        return (
          <div
            key={entry.playerId}
            className="border-b border-border last:border-b-0"
          >
            <button
              onClick={() => toggle(entry.playerId)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <RankBadge rank={entry.rank} />
              <span className="flex-1 text-sm font-medium text-foreground">
                {entry.playerName}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {entry.totalPoints} pts
              </span>
              <span className="text-xs text-muted-foreground">
                {isExpanded ? "▲" : "▼"}
              </span>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        Wrestler
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        School
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        Wt
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        Seed
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        Pick
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-1.5">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.wrestlers.map((w) => (
                      <tr
                        key={w.wrestlerId}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="py-1.5 text-foreground">{w.name}</td>
                        <td className="py-1.5 text-muted-foreground">
                          {w.team}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {w.weightClass}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          ({w.seed})
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          #{w.overallPick}
                        </td>
                        <td className="py-1.5 text-right text-foreground">
                          {w.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
