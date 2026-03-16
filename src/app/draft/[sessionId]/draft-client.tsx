"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import {
  useDraftEvents,
  type ConnectionStatus,
} from "../../../../hooks/use-draft-events";
import { makePick } from "../../../../actions/draft";
import { setPreSelection } from "../../../../actions/preselection";
import { WrestlerList } from "../../../components/WrestlerList";
import { WeightClassFilter } from "../../../components/WeightClassFilter";
import { PickHistory } from "../../../components/PickHistory";
import { TurnIndicator } from "../../../components/TurnIndicator";
import { PlayerRoster } from "../../../components/PlayerRoster";
import { PickConfirmation } from "../../../components/PickConfirmation";
import { PreSelectionControl } from "../../../components/PreSelectionControl";
import { getCurrentDraftPosition } from "../../../../lib/draft-order";
import type { SortMode } from "../../../components/WrestlerList";

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

export function PlayerDraftClient({
  sessionId,
  playerId,
}: {
  sessionId: string;
  playerId: string;
}) {
  const { state, connectionStatus } = useDraftEvents(sessionId);
  const [weightClassFilter, setWeightClassFilter] = useState<number | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("weight");
  const [hidePicked, setHidePicked] = useState(true);
  const [hideLocked, setHideLocked] = useState(false);
  const [selectedWrestlerId, setSelectedWrestlerId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentPlayer = useMemo(
    () => state?.players.find((p) => p.id === playerId) ?? null,
    [state?.players, playerId],
  );

  const isMyTurn = state?.turn.currentPlayerId === playerId;

  const myPicks = useMemo(
    () => state?.picks.filter((p) => p.playerId === playerId) ?? [],
    [state?.picks, playerId],
  );

  const lockedWeightClasses = useMemo(
    () => new Set(myPicks.map((p) => p.weightClass)),
    [myPicks],
  );

  const picksUntilMyTurn = useMemo(() => {
    if (!state || !currentPlayer || isMyTurn) return null;
    if (state.session.status !== "active") return null;
    const playerCount = state.session.playerCount;
    const myDraftOrder = currentPlayer.draftOrder;
    const currentPick = state.turn.pickNumber;
    const totalPicks = playerCount * 10;
    // Walk forward from the current pick to find the next pick where it's my turn
    for (let i = 1; i <= totalPicks - currentPick; i++) {
      const futurePick = currentPick + i;
      const pos = getCurrentDraftPosition(futurePick, playerCount);
      if (pos.draftOrderPosition === myDraftOrder) {
        return i;
      }
    }
    return null; // draft will end before my next turn
  }, [state, currentPlayer, isMyTurn]);

  const selectedWrestler = useMemo(
    () =>
      state?.wrestlers.find(
        (w) => w.sessionWrestlerId === selectedWrestlerId,
      ) ?? null,
    [state?.wrestlers, selectedWrestlerId],
  );

  const handleWrestlerSelect = useCallback(
    (sessionWrestlerId: string) => {
      setSearchQuery("");
      if (isMyTurn) {
        setSelectedWrestlerId(sessionWrestlerId);
        setError("");
      } else {
        // Pre-select when not the player's turn
        startTransition(async () => {
          const result = await setPreSelection(
            sessionId,
            playerId,
            sessionWrestlerId,
          );
          if (!result.success) {
            setError(result.error);
          } else {
            setError("");
          }
        });
      }
    },
    [isMyTurn, sessionId, playerId],
  );

  const handleConfirmPick = useCallback(() => {
    if (!selectedWrestlerId) return;
    setError("");
    startTransition(async () => {
      const result = await makePick(sessionId, playerId, selectedWrestlerId);
      if (!result.success) {
        setError(result.error);
      } else {
        setSelectedWrestlerId(null);
      }
    });
  }, [selectedWrestlerId, sessionId, playerId]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading draft...</p>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-foreground mb-1">Player not found</p>
          <p className="text-xs text-muted-foreground">
            Check the playerId in the URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {state.session.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentPlayer.name} · Round {state.session.currentRound}
            </p>
          </div>
          <ConnectionDot status={connectionStatus} />
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-4">
          <a
            href={`/draft/${sessionId}/display`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            Open Display View ↗
          </a>
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        {/* Desktop: side-by-side / Mobile: stacked */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left column (wider) */}
          <div className="flex-1 md:w-3/5 space-y-4">
            <TurnIndicator
              turn={state.turn}
              sessionStatus={state.session.status}
              isMyTurn={isMyTurn}
              picksUntilMyTurn={picksUntilMyTurn}
            />

            <WeightClassFilter
              value={weightClassFilter}
              onChange={setWeightClassFilter}
              lockedWeightClasses={lockedWeightClasses}
            />

            {/* Search + Sort controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or school..."
                className="flex-1 px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Sort order"
              >
                <option value="weight">Sort by Weight Class</option>
                <option value="seed">Sort by Overall Seed</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={hidePicked}
                onChange={(e) => setHidePicked(e.target.checked)}
                className="rounded border-border"
              />
              Hide picked wrestlers
            </label>

            {weightClassFilter === "all" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideLocked}
                  onChange={(e) => setHideLocked(e.target.checked)}
                  className="rounded border-border"
                />
                Hide locked weight classes
              </label>
            )}

            <WrestlerList
              wrestlers={state.wrestlers}
              weightClassFilter={weightClassFilter}
              onSelect={handleWrestlerSelect}
              selectedId={
                isMyTurn
                  ? selectedWrestlerId
                  : currentPlayer.preSelectedWrestlerId
              }
              lockedWeightClasses={lockedWeightClasses}
              searchQuery={searchQuery}
              sortMode={sortMode}
              hidePicked={hidePicked}
              hideLocked={hideLocked}
            />

            {isMyTurn ? (
              <PickConfirmation
                selectedWrestler={selectedWrestler}
                onConfirm={handleConfirmPick}
                isPending={isPending}
                isMyTurn={isMyTurn}
              />
            ) : (
              <PreSelectionControl
                preSelectedWrestlerId={currentPlayer.preSelectedWrestlerId}
                wrestlers={state.wrestlers}
                sessionId={sessionId}
                playerId={playerId}
                isMyTurn={isMyTurn}
              />
            )}
          </div>

          {/* Right column */}
          <div className="md:w-2/5 space-y-4">
            <PlayerRoster picks={myPicks} playerName={currentPlayer.name} />
            <PickHistory picks={state.picks} />
          </div>
        </div>
      </div>
    </div>
  );
}
