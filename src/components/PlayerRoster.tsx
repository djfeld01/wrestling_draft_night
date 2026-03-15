"use client";

import { useMemo } from "react";
import type { DraftStatePick } from "../../hooks/use-draft-events";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

interface PlayerRosterProps {
  picks: DraftStatePick[];
  playerName: string;
}

export function PlayerRoster({ picks, playerName }: PlayerRosterProps) {
  const picksByWeightClass = useMemo(() => {
    const map = new Map<number, DraftStatePick>();
    for (const pick of picks) {
      map.set(pick.weightClass, pick);
    }
    return map;
  }, [picks]);

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">
          {playerName}&apos;s Roster
        </h2>
      </div>
      <div className="divide-y divide-border">
        {WEIGHT_CLASSES.map((wc) => {
          const pick = picksByWeightClass.get(wc);
          return (
            <div
              key={wc}
              className="flex items-center justify-between px-3 py-2"
            >
              <span className="text-xs font-medium text-muted-foreground w-10">
                {wc}
              </span>
              {pick ? (
                <span className="text-sm text-foreground flex-1">
                  #{pick.wrestlerSeed} {pick.wrestlerName}{" "}
                  <span className="text-muted-foreground">
                    ({pick.wrestlerTeam})
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground flex-1">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
