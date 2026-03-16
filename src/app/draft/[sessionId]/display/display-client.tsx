"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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

// --- Picked Wrestler View Modes ---
type PickedView = "compact" | "expanded" | "hidden";

// --- Dim Mode ---
type DimMode = "off" | "current" | string; // "off", "current" (on the clock), or playerId

// --- Weight Class Board (main content) ---

function WeightClassBoard({
  state,
  teamColorMap,
  pickedView,
  dimmedWeightClasses,
  highlightPlayerId,
}: {
  state: DraftState;
  teamColorMap: Map<string, (typeof TEAM_COLORS)[0]>;
  pickedView: PickedView;
  dimmedWeightClasses: Set<number>;
  highlightPlayerId: string | null;
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
        const isDimmed = dimmedWeightClasses.has(wc);
        return (
          <div
            key={wc}
            className={`flex flex-col min-w-0 overflow-hidden ${isDimmed ? "opacity-50" : ""}`}
          >
            <div
              className={`text-center text-sm font-bold py-2 border-b-2 border-border shrink-0 ${isDimmed ? "bg-gray-400 text-gray-600" : "bg-gray-200 text-black"}`}
            >
              {wc}
            </div>
            <div className="flex flex-col gap-0.5 p-0.5 overflow-y-auto hide-scrollbar">
              {(() => {
                // Count available wrestlers to determine top-10 status
                let availableIndex = 0;
                return wrestlers.map((w) => {
                  const pick = pickByWrestler.get(w.sessionWrestlerId);
                  if (pick) {
                    // Hidden mode — skip drafted wrestlers entirely
                    if (pickedView === "hidden") return null;

                    const color = teamColorMap.get(pick.playerId);
                    const isHighlightedPlayer =
                      pick.playerId === highlightPlayerId;

                    // Expanded mode OR highlighted player's pick — wider bar with wrestler name
                    if (pickedView === "expanded" || isHighlightedPlayer) {
                      return (
                        <div
                          key={w.sessionWrestlerId}
                          className={`px-1.5 py-1 rounded text-center ${isHighlightedPlayer ? "ring-1 ring-foreground/30" : ""} ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"}`}
                          title={`${w.name} — picked by ${pick.playerName}`}
                        >
                          <div className="text-[10px] font-medium leading-tight truncate">
                            {w.name}
                          </div>
                          <div className="text-[8px] opacity-70 leading-tight truncate">
                            {pick.playerName}
                          </div>
                        </div>
                      );
                    }

                    // Compact mode (default) — thin colored bar
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
                    availableIndex % 2 === 0 ? "bg-background" : "bg-gray-800";
                  availableIndex++;
                  const nameParts = w.name.split(" ");
                  const firstName = nameParts[0] || "";
                  const lastName = nameParts.slice(1).join(" ") || "";

                  if (isTop10) {
                    return (
                      <div
                        key={w.sessionWrestlerId}
                        className={`flex items-center border border-border rounded ${rowBg}`}
                      >
                        <div className="w-1/4 flex items-center justify-center shrink-0 py-1.5">
                          <span className="text-sm font-bold text-muted-foreground leading-none">
                            {w.seed}
                          </span>
                        </div>
                        <div className="w-3/4 flex flex-col items-center justify-center py-1 pr-1 min-w-0">
                          <div className="text-[10px] text-muted-foreground truncate leading-tight w-full text-center">
                            {firstName}
                          </div>
                          <div className="text-xs font-semibold text-foreground truncate leading-tight w-full text-center">
                            {lastName}
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate leading-tight w-full text-center">
                            {w.team}
                          </div>
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

// --- Draft Order Strip (replaces CurrentTurnBanner + TeamLegend) ---

function DraftOrderStrip({
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

  // Snake draft direction: odd rounds go forward (→), even rounds go backward (←)
  const isForward = state.turn.round % 2 === 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-0.5 text-xs text-muted-foreground">
        <span>Round {state.turn.round}</span>
        <span>·</span>
        <span>Pick #{state.turn.pickNumber}</span>
        <span className="ml-1 text-sm">{isForward ? "→" : "←"}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        {sorted.map((p, i) => {
          const color = teamColorMap.get(p.id);
          const isOnClock = p.id === state.turn.currentPlayerId;

          return (
            <div key={p.id} className="flex items-center">
              {i > 0 && (
                <span className="text-muted-foreground/40 text-[10px] mx-0.5">
                  {isForward ? "›" : "‹"}
                </span>
              )}
              <span
                className={`inline-flex items-center justify-center rounded font-medium truncate transition-all ${
                  color?.bg ?? "bg-muted"
                } ${color?.text ?? "text-muted-foreground"} ${
                  isOnClock
                    ? "px-3 py-1.5 text-sm ring-2 ring-foreground"
                    : "px-2 py-0.5 text-[10px]"
                }`}
              >
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const recent = useMemo(
    () => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 20),
    [picks],
  );

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [recent, updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

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
    <div className="border-b border-border relative flex items-center">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 h-full px-1.5 bg-gradient-to-r from-background to-transparent flex items-center"
          aria-label="Scroll recent picks left"
        >
          <span className="text-muted-foreground text-sm">◀</span>
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex items-center gap-2 overflow-x-auto hide-scrollbar px-3 py-1.5"
      >
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
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 h-full px-1.5 bg-gradient-to-l from-background to-transparent flex items-center"
          aria-label="Scroll recent picks right"
        >
          <span className="text-muted-foreground text-sm">▶</span>
        </button>
      )}
    </div>
  );
}

// --- Main Display Client ---

export function DisplayClient({ sessionId }: { sessionId: string }) {
  const { state, connectionStatus } = useDraftEvents(sessionId);
  const [pickedView, setPickedView] = useState<PickedView>("compact");
  const [dimMode, setDimMode] = useState<DimMode>("off");

  const teamColorMap = useMemo(
    () => (state ? buildTeamColorMap(state.players) : new Map()),
    [state],
  );

  // Compute which weight classes to dim based on dimMode
  const dimmedWeightClasses = useMemo(() => {
    if (!state || dimMode === "off") return new Set<number>();
    const targetPlayerId =
      dimMode === "current" ? state.turn.currentPlayerId : dimMode;
    if (!targetPlayerId) return new Set<number>();
    const playerPicks = state.picks.filter(
      (p) => p.playerId === targetPlayerId,
    );
    return new Set(playerPicks.map((p) => p.weightClass));
  }, [state, dimMode]);

  // When dimming is active, highlight that player's picks (auto-expand them)
  const highlightPlayerId = useMemo(() => {
    if (!state || dimMode === "off") return null;
    return dimMode === "current" ? state.turn.currentPlayerId : dimMode;
  }, [state, dimMode]);

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
      <div className="px-4 py-1 border-b border-border">
        <DraftOrderStrip state={state} teamColorMap={teamColorMap} />
      </div>

      {/* Recent picks — horizontal scrolling strip */}
      <RecentPicks picks={state.picks} teamColorMap={teamColorMap} />

      {/* Picked wrestler view toggle + Dim toggle */}
      <div className="flex items-center justify-center gap-4 px-3 py-1 border-b border-border">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">
            Picked:
          </span>
          {(["compact", "expanded", "hidden"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPickedView(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                pickedView === mode
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {mode === "compact"
                ? "Compact"
                : mode === "expanded"
                  ? "Expanded"
                  : "Hidden"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Dim:</span>
          <button
            onClick={() => setDimMode("off")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              dimMode === "off"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Off
          </button>
          <button
            onClick={() => setDimMode("current")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              dimMode === "current"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            On the Clock
          </button>
          <select
            value={dimMode !== "off" && dimMode !== "current" ? dimMode : ""}
            onChange={(e) => setDimMode(e.target.value || "off")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-background transition-colors ${
              dimMode !== "off" && dimMode !== "current"
                ? "text-accent-foreground bg-accent"
                : "text-muted-foreground"
            }`}
          >
            <option value="">Team...</option>
            {[...state.players]
              .sort((a, b) => a.draftOrder - b.draftOrder)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

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
        <WeightClassBoard
          state={state}
          teamColorMap={teamColorMap}
          pickedView={pickedView}
          dimmedWeightClasses={dimmedWeightClasses}
          highlightPlayerId={highlightPlayerId}
        />
      </div>
    </div>
  );
}
