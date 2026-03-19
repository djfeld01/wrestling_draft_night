"use client";

import { useState } from "react";
import type { ScoreboardEntry } from "../../../../actions/scores";

type SortKey = "points" | "weightClass" | "name" | "overallPick" | "seed";
type SortDir = "asc" | "desc";

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

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`text-xs font-medium text-muted-foreground py-1.5 cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5">{currentDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

export function ScoreboardClient({ entries }: { entries: ScoreboardEntry[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggle(playerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  }

  function sortWrestlers(
    wrestlers: ScoreboardEntry["wrestlers"],
  ): ScoreboardEntry["wrestlers"] {
    const sorted = [...wrestlers];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "weightClass":
          return dir * (a.weightClass - b.weightClass);
        case "seed":
          return dir * (a.seed - b.seed);
        case "overallPick":
          return dir * (a.overallPick - b.overallPick);
        case "points":
        default:
          return dir * (a.points - b.points);
      }
    });
    return sorted;
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
                      <SortHeader
                        label="Wrestler"
                        sortKey="name"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <th className="text-left text-xs font-medium text-muted-foreground py-1.5">
                        School
                      </th>
                      <SortHeader
                        label="Wt"
                        sortKey="weightClass"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Seed"
                        sortKey="seed"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Pick"
                        sortKey="overallPick"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Pts"
                        sortKey="points"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortWrestlers(entry.wrestlers).map((w) => (
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
