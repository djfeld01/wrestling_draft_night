"use client";

import { useMemo } from "react";
import {
  useDraftEvents,
  type DraftState,
  type DraftStatePick,
  type DraftStateWrestler,
  type ConnectionStatus,
} from "../../../../../hooks/use-draft-events";
import { JoinQRCode } from "../../../../components/JoinQRCode";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

// Muted team color palette — bg and text pairs
const TEAM_COLORS = [
  { bg: "bg-blue-200", text: "text-blue-900" },
  { bg: "bg-rose-200", text: "text-rose-900" },
  { bg: "bg-emerald-200", text: "text-emerald-900" },
  { bg: "bg-amber-200", text: "text-amber-900" },
  { bg: "bg-violet-200", text: "text-violet-900" },
  { bg: "bg-cyan-200", text: "text-cyan-900" },
  { bg: "bg-orange-200", text: "text-orange-900" },
  { bg: "bg-pink-200", text: "text-pink-900" },
  { bg: "bg-teal-200", text: "text-teal-900" },
  { bg: "bg-indigo-200", text: "text-indigo-900" },
  { bg: "bg-lime-200", text: "text-lime-900" },
  { bg: "bg-fuchsia-200", text: "text-fuchsia-900" },
];

function buildTeamColorMap(players: DraftState["players"]) {
  const map = new Map<string, (typeof TEAM_COLORS)[0]>();
  const sorted = [...players].sort((a, b) => a.draftOrder - b.draftOrder);
  sorted.forEach((p, i) => {
    map.set(p.id, TEAM_COLORS[i % TEAM_COLORS.length]);
  });
  return map;
}

// --- Header Bar ---

function DisplayHeader({
  state,
  connectionStatus,
}: {
  state: DraftState;
  connectionStatus: ConnectionStatus;
}) {
  const totalPicks = state.session.playerCount * 10;
  const picksMade = state.picks.length;

  const connectionColor =
    connectionStatus === "connected"
      ? "bg-success"
      : connectionStatus === "connecting"
        ? "bg-yellow-500"
        : "bg-destructive";

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          {state.session.name}
        </h1>
        <span className="text-sm text-muted-foreground">
          Round {state.session.currentRound} of 10
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Pick {picksMade}/{totalPicks}
        </span>
        <StatusBadge status={state.session.status} />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connectionColor}`}
          />
          {connectionStatus}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    setup: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    completed: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.setup}`}
    >
      {status}
    </span>
  );
}

// --- Weight Class Board (main content) ---

function WeightClassBoard({
  state,
  teamColorMap,
}: {
  state: DraftState;
  teamColorMap: Map<string, (typeof TEAM_COLORS)[0]>;
}) {
  // Build a lookup: sessionWrestlerId -> pick (for drafted wrestlers)
  const pickByWrestler = useMemo(() => {
    const map = new Map<string, DraftStatePick>();
    for (const pick of state.picks) {
      map.set(pick.sessionWrestlerId, pick);
    }
    return map;
  }, [state.picks]);

  // Group wrestlers by weight class, sorted by seed (all wrestlers, scrollable)
  const columns = useMemo(() => {
    const groups = new Map<number, DraftStateWrestler[]>();
    for (const wc of WEIGHT_CLASSES) {
      groups.set(wc, []);
    }
    for (const w of state.wrestlers) {
      const list = groups.get(w.weightClass);
      if (list) list.push(w);
    }
    for (const [wc, list] of groups) {
      list.sort((a, b) => a.seed - b.seed);
      groups.set(wc, list);
    }
    return groups;
  }, [state.wrestlers]);

  return (
    <div className="grid grid-cols-10 gap-1 h-full overflow-hidden">
      {WEIGHT_CLASSES.map((wc) => {
        const wrestlers = columns.get(wc) ?? [];
        return (
          <div key={wc} className="flex flex-col min-w-0 overflow-hidden">
            <div className="text-center text-xs font-semibold text-foreground py-1.5 bg-muted border-b border-border shrink-0">
              {wc}
            </div>
            <div className="flex flex-col gap-0.5 p-0.5 overflow-y-auto">
              {(() => {
                // Count available wrestlers to determine top-10 status
                let availableIndex = 0;
                return wrestlers.map((w) => {
                  const pick = pickByWrestler.get(w.sessionWrestlerId);
                  if (pick) {
                    // Drafted — compact card with team color
                    const color = teamColorMap.get(pick.playerId);
                    return (
                      <div
                        key={w.sessionWrestlerId}
                        className={`px-1 py-0.5 rounded text-center truncate ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"}`}
                        title={`${w.name} — picked by ${pick.playerName}`}
                      >
                        <span className="text-[10px] font-medium leading-tight">
                          {w.name}
                        </span>
                      </div>
                    );
                  }
                  // Available wrestler
                  const isTop10 = availableIndex < 10;
                  const rowBg =
                    availableIndex % 2 === 0 ? "bg-background" : "bg-muted/40";
                  availableIndex++;
                  const nameParts = w.name.split(" ");
                  const firstName = nameParts[0] || "";
                  const lastName = nameParts.slice(1).join(" ") || "";

                  if (isTop10) {
                    return (
                      <div
                        key={w.sessionWrestlerId}
                        className={`px-1 py-1.5 border border-border rounded ${rowBg}`}
                      >
                        <div className="text-[10px] text-muted-foreground truncate leading-tight">
                          ({w.seed}) {firstName}
                        </div>
                        <div className="text-xs font-semibold text-foreground truncate leading-tight">
                          {lastName}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate leading-tight">
                          {w.team}
                        </div>
                      </div>
                    );
                  }
                  // Below top 10 — compact single line
                  return (
                    <div
                      key={w.sessionWrestlerId}
                      className={`px-1 py-0.5 border border-border/50 rounded ${rowBg}`}
                    >
                      <div className="text-[9px] text-muted-foreground truncate leading-tight">
                        ({w.seed}) {w.name}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Current Turn Banner ---

function CurrentTurnBanner({ state }: { state: DraftState }) {
  if (state.session.status === "completed") {
    return (
      <div className="text-center py-2">
        <p className="text-sm font-semibold text-muted-foreground">
          Draft Complete
        </p>
      </div>
    );
  }

  if (state.session.status === "setup") {
    return (
      <div className="text-center py-2">
        <p className="text-sm font-semibold text-muted-foreground">
          Waiting to Start
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-1">
      <p className="text-xs text-muted-foreground">On the Clock</p>
      <p className="text-base font-bold text-foreground">
        {state.turn.currentPlayerName ?? "—"}
      </p>
      <p className="text-xs text-muted-foreground">
        Round {state.turn.round} · Pick #{state.turn.pickNumber}
      </p>
    </div>
  );
}

// --- Team Legend ---

function TeamLegend({
  state,
  teamColorMap,
}: {
  state: DraftState;
  teamColorMap: Map<string, (typeof TEAM_COLORS)[0]>;
}) {
  const sorted = useMemo(
    () => [...state.players].sort((a, b) => a.draftOrder - b.draftOrder),
    [state.players],
  );

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {sorted.map((p) => {
        const color = teamColorMap.get(p.id);
        const isCurrentTurn =
          p.id === state.turn.currentPlayerId &&
          state.session.status === "active";
        return (
          <span
            key={p.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"} ${isCurrentTurn ? "ring-2 ring-foreground" : ""}`}
          >
            #{p.draftOrder} {p.name}
          </span>
        );
      })}
    </div>
  );
}

// --- Recent Picks (compact sidebar) ---

function RecentPicks({
  picks,
  teamColorMap,
}: {
  picks: DraftStatePick[];
  teamColorMap: Map<string, (typeof TEAM_COLORS)[0]>;
}) {
  const recent = useMemo(
    () => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 20),
    [picks],
  );

  if (recent.length === 0) {
    return (
      <div className="px-4 py-1.5 border-b border-border">
        <p className="text-xs text-muted-foreground text-center">
          No picks yet
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-1.5 scrollbar-thin">
        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
          Recent:
        </span>
        {recent.map((pick) => {
          const color = teamColorMap.get(pick.playerId);
          return (
            <div
              key={pick.id}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"}`}
            >
              <span className="text-[10px] font-medium">{pick.playerName}</span>
              <span className="text-[10px] opacity-70">
                {pick.wrestlerName} · {pick.weightClass}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Display Client ---

export function DisplayClient({ sessionId }: { sessionId: string }) {
  const { state, connectionStatus } = useDraftEvents(sessionId);

  const teamColorMap = useMemo(
    () => (state ? buildTeamColorMap(state.players) : new Map()),
    [state],
  );

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading draft...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <DisplayHeader state={state} connectionStatus={connectionStatus} />

      {/* Turn + Team Legend */}
      <div className="px-4 py-1 border-b border-border space-y-1">
        <CurrentTurnBanner state={state} />
        <TeamLegend state={state} teamColorMap={teamColorMap} />
      </div>

      {/* Recent picks — horizontal scrolling strip */}
      <RecentPicks picks={state.picks} teamColorMap={teamColorMap} />

      {/* QR code during setup */}
      {state.session.status === "setup" && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
          <JoinQRCode sessionId={sessionId} size={80} />
          <p className="text-xs text-muted-foreground">
            Scan to join this draft
          </p>
        </div>
      )}

      {/* Weight class board — fills remaining space */}
      <div className="flex-1 min-h-0 p-2">
        <WeightClassBoard state={state} teamColorMap={teamColorMap} />
      </div>
    </div>
  );
}
