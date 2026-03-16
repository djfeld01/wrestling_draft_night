"use client";

import { useState, useTransition, useMemo } from "react";
import {
  useDraftEvents,
  type DraftState,
  type DraftStatePick,
} from "../../../../../hooks/use-draft-events";
import {
  makeProxyPick,
  undoLastPick,
  reassignPick,
} from "../../../../../actions/draft";
import type { ConnectionStatus } from "../../../../../hooks/use-draft-events";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

// --- Small UI helpers ---

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

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === "connected"
      ? "bg-success"
      : status === "connecting"
        ? "bg-yellow-500"
        : "bg-destructive";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {status}
    </span>
  );
}

// --- Header ---

function Header({
  state,
  connectionStatus,
  sessionId,
}: {
  state: DraftState;
  connectionStatus: ConnectionStatus;
  sessionId: string;
}) {
  const totalPicks = state.session.playerCount * 10;
  const picksMade = state.picks.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {state.session.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Round {state.session.currentRound} · Pick {picksMade}/{totalPicks}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={`/draft/${sessionId}/display`}
          target="_blank"
          className="text-xs text-accent hover:underline"
        >
          Display View
        </a>
        <StatusBadge status={state.session.status} />
        <ConnectionDot status={connectionStatus} />
      </div>
    </div>
  );
}

// --- Current Turn ---

function CurrentTurn({ state }: { state: DraftState }) {
  if (state.session.status === "completed") {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted">
        <p className="text-sm font-medium text-muted-foreground">
          Draft complete
        </p>
      </div>
    );
  }

  if (state.session.status === "setup") {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted">
        <p className="text-sm font-medium text-muted-foreground">
          Draft has not started
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-muted">
      <p className="text-xs text-muted-foreground mb-1">Current turn</p>
      <p className="text-lg font-semibold text-foreground">
        {state.turn.currentPlayerName ?? "—"}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Draft order #{state.turn.draftOrderPosition} · Round {state.turn.round}{" "}
        · Pick #{state.turn.pickNumber}
      </p>
    </div>
  );
}

// --- Proxy Pick ---

function ProxyPick({
  state,
  sessionId,
}: {
  state: DraftState;
  sessionId: string;
}) {
  const [weightClassFilter, setWeightClassFilter] = useState<number | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"weight" | "seed">("weight");
  const [hidePicked, setHidePicked] = useState(true);
  const [selectedWrestlerId, setSelectedWrestlerId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Determine which weight classes the current player has already drafted
  const lockedWeightClasses = useMemo(() => {
    const currentPlayerPicks = state.picks.filter(
      (p) => p.playerId === state.turn.currentPlayerId,
    );
    return new Set(currentPlayerPicks.map((p) => p.weightClass));
  }, [state.picks, state.turn.currentPlayerId]);

  const availableWrestlers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return state.wrestlers
      .filter((w) => !hidePicked || w.isAvailable)
      .filter((w) => !lockedWeightClasses.has(w.weightClass))
      .filter(
        (w) =>
          weightClassFilter === "all" || w.weightClass === weightClassFilter,
      )
      .filter(
        (w) =>
          !query ||
          w.name.toLowerCase().includes(query) ||
          w.team.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sortMode === "seed") {
          return a.seed - b.seed;
        }
        return a.weightClass !== b.weightClass
          ? a.weightClass - b.weightClass
          : a.seed - b.seed;
      });
  }, [
    state.wrestlers,
    weightClassFilter,
    lockedWeightClasses,
    searchQuery,
    sortMode,
    hidePicked,
  ]);

  function handleConfirm() {
    if (!selectedWrestlerId) return;
    setError("");
    startTransition(async () => {
      const result = await makeProxyPick(sessionId, selectedWrestlerId);
      if (!result.success) {
        setError(result.error);
      } else {
        setSelectedWrestlerId(null);
      }
    });
  }

  if (state.session.status !== "active") return null;

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Proxy Pick</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick on behalf of {state.turn.currentPlayerName}
        </p>
      </div>
      <div className="p-4">
        <div className="mb-3">
          <label
            htmlFor="wc-filter"
            className="block text-xs text-muted-foreground mb-1"
          >
            Weight class
          </label>
          <select
            id="wc-filter"
            value={weightClassFilter}
            onChange={(e) =>
              setWeightClassFilter(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All</option>
            {WEIGHT_CLASSES.filter((wc) => !lockedWeightClasses.has(wc)).map(
              (wc) => (
                <option key={wc} value={wc}>
                  {wc}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or school..."
            className="flex-1 px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "weight" | "seed")}
            className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Sort order"
          >
            <option value="weight">Sort by Weight Class</option>
            <option value="seed">Sort by Overall Seed</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={hidePicked}
            onChange={(e) => setHidePicked(e.target.checked)}
            className="rounded border-border"
          />
          Hide picked wrestlers
        </label>

        <div className="max-h-64 overflow-y-auto border border-border rounded-md">
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
                  Wt
                </th>
              </tr>
            </thead>
            <tbody>
              {availableWrestlers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-xs text-muted-foreground py-4"
                  >
                    No available wrestlers
                  </td>
                </tr>
              )}
              {availableWrestlers.map((w) => {
                const isPicked = !w.isAvailable;
                return (
                  <tr
                    key={w.sessionWrestlerId}
                    onClick={
                      !isPicked
                        ? () => setSelectedWrestlerId(w.sessionWrestlerId)
                        : undefined
                    }
                    className={`border-b border-border last:border-b-0 transition-colors ${
                      isPicked
                        ? "opacity-40"
                        : selectedWrestlerId === w.sessionWrestlerId
                          ? "bg-accent/10 cursor-pointer"
                          : "hover:bg-muted cursor-pointer"
                    }`}
                  >
                    <td className="py-1.5 px-3 text-muted-foreground">
                      {w.seed}
                    </td>
                    <td className="py-1.5 px-3 text-foreground">
                      <span className={isPicked ? "line-through" : ""}>
                        {w.name}
                      </span>
                      {isPicked && (
                        <span className="ml-1.5 inline-block px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground leading-none">
                          Picked
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-muted-foreground">
                      {w.team}
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

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={!selectedWrestlerId || isPending}
          className="mt-3 px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity w-full"
        >
          {isPending ? "Picking..." : "Confirm Proxy Pick"}
        </button>
      </div>
    </div>
  );
}

// --- Pick History with Undo ---

function PickHistory({
  state,
  sessionId,
}: {
  state: DraftState;
  sessionId: string;
}) {
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const sortedPicks = useMemo(
    () => [...state.picks].sort((a, b) => b.pickNumber - a.pickNumber),
    [state.picks],
  );

  function handleUndo() {
    if (!confirmUndo) {
      setConfirmUndo(true);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await undoLastPick(sessionId);
      if (!result.success) {
        setError(result.error);
      }
      setConfirmUndo(false);
    });
  }

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Pick History</h2>
        {sortedPicks.length > 0 && state.session.status === "active" && (
          <button
            onClick={handleUndo}
            disabled={isPending}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              confirmUndo
                ? "bg-destructive text-white hover:opacity-90"
                : "border border-border text-foreground hover:bg-muted"
            } disabled:opacity-50`}
          >
            {isPending
              ? "Undoing..."
              : confirmUndo
                ? "Confirm Undo"
                : "Undo Last"}
          </button>
        )}
      </div>
      {error && <p className="px-4 pt-2 text-sm text-destructive">{error}</p>}
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                #
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                Player
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                Wrestler
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                Wt
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
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
                <td className="py-1.5 px-4 text-muted-foreground">
                  {pick.pickNumber}
                </td>
                <td className="py-1.5 px-4 text-foreground">
                  {pick.playerName}
                </td>
                <td className="py-1.5 px-4 text-foreground">
                  {pick.wrestlerName}
                </td>
                <td className="py-1.5 px-4 text-muted-foreground">
                  {pick.weightClass}
                </td>
                <td className="py-1.5 px-4 text-muted-foreground">
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

// --- Reassign Control ---

function ReassignControl({
  state,
  sessionId,
}: {
  state: DraftState;
  sessionId: string;
}) {
  const [selectedPickId, setSelectedPickId] = useState<string | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedPick = state.picks.find((p) => p.id === selectedPickId);

  // Available replacements: same weight class, available
  const replacements = useMemo(() => {
    if (!selectedPick) return [];
    return state.wrestlers
      .filter(
        (w) => w.isAvailable && w.weightClass === selectedPick.weightClass,
      )
      .sort((a, b) => a.seed - b.seed);
  }, [state.wrestlers, selectedPick]);

  function handleConfirm() {
    if (!selectedPickId || !selectedReplacementId) return;
    setError("");
    startTransition(async () => {
      const result = await reassignPick(
        sessionId,
        selectedPickId,
        selectedReplacementId,
      );
      if (!result.success) {
        setError(result.error);
      } else {
        setSelectedPickId(null);
        setSelectedReplacementId(null);
      }
    });
  }

  // Sort picks most recent first for the dropdown
  const sortedPicks = useMemo(
    () => [...state.picks].sort((a, b) => b.pickNumber - a.pickNumber),
    [state.picks],
  );

  if (state.picks.length === 0) return null;

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Reassign Pick</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Swap a pick to a different wrestler in the same weight class
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label
            htmlFor="pick-select"
            className="block text-xs text-muted-foreground mb-1"
          >
            Select pick to reassign
          </label>
          <select
            id="pick-select"
            value={selectedPickId ?? ""}
            onChange={(e) => {
              setSelectedPickId(e.target.value || null);
              setSelectedReplacementId(null);
              setError("");
            }}
            className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Choose a pick...</option>
            {sortedPicks.map((pick) => (
              <option key={pick.id} value={pick.id}>
                #{pick.pickNumber} — {pick.playerName}: {pick.wrestlerName} (
                {pick.weightClass})
              </option>
            ))}
          </select>
        </div>

        {selectedPick && (
          <div>
            <label
              htmlFor="replacement-select"
              className="block text-xs text-muted-foreground mb-1"
            >
              Replacement wrestler ({selectedPick.weightClass} lbs)
            </label>
            {replacements.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No available wrestlers in this weight class
              </p>
            ) : (
              <select
                id="replacement-select"
                value={selectedReplacementId ?? ""}
                onChange={(e) => {
                  setSelectedReplacementId(e.target.value || null);
                  setError("");
                }}
                className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Choose a wrestler...</option>
                {replacements.map((w) => (
                  <option key={w.sessionWrestlerId} value={w.sessionWrestlerId}>
                    #{w.seed} {w.name} ({w.team})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={!selectedPickId || !selectedReplacementId || isPending}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity w-full"
        >
          {isPending ? "Reassigning..." : "Confirm Reassign"}
        </button>
      </div>
    </div>
  );
}

// --- Players Overview ---

function PlayersOverview({ state }: { state: DraftState }) {
  // Group picks by player
  const picksByPlayer = useMemo(() => {
    const map = new Map<string, DraftStatePick[]>();
    for (const player of state.players) {
      map.set(player.id, []);
    }
    for (const pick of state.picks) {
      const list = map.get(pick.playerId) ?? [];
      list.push(pick);
      map.set(pick.playerId, list);
    }
    return map;
  }, [state.players, state.picks]);

  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => a.draftOrder - b.draftOrder),
    [state.players],
  );

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Players</h2>
      </div>
      <div className="divide-y divide-border">
        {sortedPlayers.map((player) => {
          const playerPicks = picksByPlayer.get(player.id) ?? [];
          const picksByWc = new Map<number, DraftStatePick>();
          for (const pick of playerPicks) {
            picksByWc.set(pick.weightClass, pick);
          }

          const isCurrentTurn = player.id === state.turn.currentPlayerId;

          return (
            <div key={player.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-sm font-medium ${isCurrentTurn ? "text-success" : "text-foreground"}`}
                >
                  {player.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  #{player.draftOrder}
                </span>
                {isCurrentTurn && state.session.status === "active" && (
                  <span className="text-xs text-success font-medium">
                    (picking)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEIGHT_CLASSES.map((wc) => {
                  const pick = picksByWc.get(wc);
                  return (
                    <span
                      key={wc}
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        pick
                          ? "bg-accent/10 text-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={
                        pick
                          ? `${wc}: #${pick.wrestlerSeed} ${pick.wrestlerName}`
                          : `${wc}: —`
                      }
                    >
                      {wc}:{" "}
                      {pick ? (
                        <span className="font-medium">{pick.wrestlerName}</span>
                      ) : (
                        "—"
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Admin Draft Client ---

export function AdminDraftClient({ sessionId }: { sessionId: string }) {
  const { state, connectionStatus } = useDraftEvents(sessionId);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading draft state...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Header
          state={state}
          connectionStatus={connectionStatus}
          sessionId={sessionId}
        />

        {state.session.status === "completed" && (
          <div className="mt-4 flex gap-2">
            <a
              href={`/api/draft/${sessionId}/export?format=csv`}
              download
              className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Export CSV
            </a>
            <a
              href={`/api/draft/${sessionId}/export?format=xlsx`}
              download
              className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Export XLSX
            </a>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <CurrentTurn state={state} />
            <ProxyPick state={state} sessionId={sessionId} />
            <ReassignControl state={state} sessionId={sessionId} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <PickHistory state={state} sessionId={sessionId} />
            <PlayersOverview state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
