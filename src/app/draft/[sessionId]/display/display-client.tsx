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
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/50">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {state.session.name}
        </h1>
        <span className="text-lg text-muted-foreground">
          Round {state.session.currentRound} of 10
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-lg text-muted-foreground">
          Pick {picksMade} of {totalPicks}
        </span>
        <StatusBadge status={state.session.status} />
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${connectionColor}`}
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
      className={`inline-block px-3 py-1 rounded text-sm font-medium ${styles[status] || styles.setup}`}
    >
      {status}
    </span>
  );
}

// --- Draft Board (main grid) ---

function DraftBoard({ state }: { state: DraftState }) {
  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => a.draftOrder - b.draftOrder),
    [state.players],
  );

  // Build a lookup: playerId -> weightClass -> pick
  const pickGrid = useMemo(() => {
    const grid = new Map<string, Map<number, DraftStatePick>>();
    for (const player of state.players) {
      grid.set(player.id, new Map());
    }
    for (const pick of state.picks) {
      const playerMap = grid.get(pick.playerId);
      if (playerMap) {
        playerMap.set(pick.weightClass, pick);
      }
    }
    return grid;
  }, [state.players, state.picks]);

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4 sticky left-0 bg-muted z-10 min-w-[140px]">
                Player
              </th>
              {WEIGHT_CLASSES.map((wc) => (
                <th
                  key={wc}
                  className="text-center text-sm font-medium text-muted-foreground py-3 px-3 min-w-[120px]"
                >
                  {wc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const isCurrentTurn =
                player.id === state.turn.currentPlayerId &&
                state.session.status === "active";
              const playerPicks = pickGrid.get(player.id);

              return (
                <tr
                  key={player.id}
                  className={`border-b border-border last:border-b-0 transition-colors ${
                    isCurrentTurn ? "bg-success/5" : ""
                  }`}
                >
                  <td
                    className={`py-3 px-4 sticky left-0 z-10 ${
                      isCurrentTurn
                        ? "bg-success/10 font-semibold text-success"
                        : "bg-background text-foreground font-medium"
                    }`}
                  >
                    <span className="text-base">{player.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      #{player.draftOrder}
                    </span>
                  </td>
                  {WEIGHT_CLASSES.map((wc) => {
                    const pick = playerPicks?.get(wc);
                    return (
                      <td
                        key={wc}
                        className={`py-3 px-3 text-center ${
                          isCurrentTurn ? "bg-success/5" : ""
                        }`}
                      >
                        {pick ? (
                          <div>
                            <div className="text-sm font-medium text-foreground leading-tight">
                              {pick.wrestlerName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              #{pick.wrestlerSeed} {pick.wrestlerTeam}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/40">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Current Turn Indicator ---

function CurrentTurnBanner({ state }: { state: DraftState }) {
  if (state.session.status === "completed") {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted text-center">
        <p className="text-xl font-semibold text-muted-foreground">
          Draft Complete
        </p>
      </div>
    );
  }

  if (state.session.status === "setup") {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted text-center">
        <p className="text-xl font-semibold text-muted-foreground">
          Waiting to Start
        </p>
      </div>
    );
  }

  const totalPicks = state.session.playerCount * 10;
  const picksMade = state.picks.length;

  return (
    <div className="border border-border rounded-lg p-5 bg-muted/50">
      <p className="text-sm text-muted-foreground mb-1">On the Clock</p>
      <p className="text-2xl font-bold text-foreground">
        {state.turn.currentPlayerName ?? "—"}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Round {state.turn.round} · Pick #{state.turn.pickNumber} · Order #
        {state.turn.draftOrderPosition}
      </p>
      <div className="mt-3 w-full bg-border rounded-full h-2">
        <div
          className="bg-accent h-2 rounded-full transition-all duration-500"
          style={{
            width: `${totalPicks > 0 ? (picksMade / totalPicks) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {picksMade} of {totalPicks} picks
      </p>
    </div>
  );
}

// --- Recent Picks ---

function RecentPicks({ picks }: { picks: DraftStatePick[] }) {
  const recentPicks = useMemo(
    () => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 10),
    [picks],
  );

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Recent Picks</h2>
      </div>
      <div className="overflow-y-auto max-h-[400px]">
        {recentPicks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No picks yet
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentPicks.map((pick) => (
              <div key={pick.id} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {pick.playerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{pick.pickNumber}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {pick.wrestlerName} · {pick.weightClass} lbs
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Available Wrestlers by Weight Class ---

function AvailableWrestlers({
  wrestlers,
}: {
  wrestlers: DraftStateWrestler[];
}) {
  const grouped = useMemo(() => {
    const groups = new Map<number, DraftStateWrestler[]>();
    for (const wc of WEIGHT_CLASSES) {
      groups.set(wc, []);
    }
    for (const w of wrestlers) {
      if (w.isAvailable) {
        const list = groups.get(w.weightClass);
        if (list) list.push(w);
      }
    }
    // Sort each group by seed
    for (const [, list] of groups) {
      list.sort((a, b) => a.seed - b.seed);
    }
    return groups;
  }, [wrestlers]);

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">
          Available Wrestlers
        </h2>
      </div>
      <div className="overflow-y-auto max-h-[400px] p-3">
        <div className="grid grid-cols-2 gap-3">
          {WEIGHT_CLASSES.map((wc) => {
            const available = grouped.get(wc) ?? [];
            return (
              <div key={wc}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {wc} lbs
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {available.length} left
                  </span>
                </div>
                <div className="space-y-0.5">
                  {available.slice(0, 5).map((w) => (
                    <div
                      key={w.sessionWrestlerId}
                      className="text-xs text-muted-foreground truncate"
                    >
                      #{w.seed} {w.name} ({w.team})
                    </div>
                  ))}
                  {available.length > 5 && (
                    <div className="text-xs text-muted-foreground/60">
                      +{available.length - 5} more
                    </div>
                  )}
                  {available.length === 0 && (
                    <div className="text-xs text-muted-foreground/40">
                      All drafted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Display Client ---

export function DisplayClient({ sessionId }: { sessionId: string }) {
  const { state, connectionStatus } = useDraftEvents(sessionId);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading draft...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DisplayHeader state={state} connectionStatus={connectionStatus} />

      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        {/* Main area: Draft Board */}
        <div className="flex-1 min-w-0 overflow-auto">
          <DraftBoard state={state} />
        </div>

        {/* Side panel */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-auto">
          {state.session.status === "setup" && (
            <div className="border border-border rounded-lg p-4 bg-muted">
              <h3 className="text-sm font-medium text-foreground mb-3">
                Scan to Join
              </h3>
              <JoinQRCode sessionId={sessionId} size={200} />
            </div>
          )}
          <CurrentTurnBanner state={state} />
          <RecentPicks picks={state.picks} />
          <AvailableWrestlers wrestlers={state.wrestlers} />
        </div>
      </div>
    </div>
  );
}
