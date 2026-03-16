"use client";

import { useState, useEffect, useCallback } from "react";
import type { SSEEventType } from "../lib/event-types";
import type {
  DraftState,
  DraftStateWrestler,
  DraftStatePick,
  DraftStateTurn,
  DraftStatePlayer,
} from "../src/app/api/draft/[sessionId]/state/route";

// Re-export types for consumers
export type {
  DraftState,
  DraftStateWrestler,
  DraftStatePick,
  DraftStateTurn,
  DraftStatePlayer,
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface UseDraftEventsReturn {
  /** Full draft state */
  state: DraftState | null;
  /** SSE connection status */
  connectionStatus: ConnectionStatus;
  /** Manually trigger a full state refresh */
  refresh: () => Promise<void>;
}

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

export function getNextBackoff(current: number): number {
  return Math.min(current * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
}

/**
 * Fetch the full draft state from the REST endpoint.
 */
async function fetchDraftState(sessionId: string): Promise<DraftState> {
  const res = await fetch(`/api/draft/${sessionId}/state`);
  if (!res.ok) {
    throw new Error(`Failed to fetch draft state: ${res.status}`);
  }
  return res.json();
}

/**
 * Apply a pick_made event to the current state.
 */
function applyPickMade(
  state: DraftState,
  data: Record<string, unknown>,
): DraftState {
  const pickId = data.pickId as string;
  const playerId = data.playerId as string;
  const wrestlerId = data.wrestlerId as string;
  const weightClass = data.weightClass as number;
  const round = data.round as number;
  const pickNumber = data.pickNumber as number;

  // Find the wrestler and player info for the pick history entry
  const wrestler = state.wrestlers.find(
    (w) => w.sessionWrestlerId === wrestlerId,
  );
  const player = state.players.find((p) => p.id === playerId);

  // Update wrestler availability
  const updatedWrestlers = state.wrestlers.map((w) =>
    w.sessionWrestlerId === wrestlerId ? { ...w, isAvailable: false } : w,
  );

  // Append to pick history
  const newPick: DraftStatePick = {
    id: pickId,
    playerId,
    playerName: player?.name ?? "Unknown",
    sessionWrestlerId: wrestlerId,
    wrestlerName: wrestler?.name ?? "Unknown",
    wrestlerSeed: wrestler?.seed ?? 0,
    wrestlerTeam: wrestler?.team ?? "",
    weightClass,
    round,
    pickNumber,
    createdAt: new Date().toISOString(),
  };

  const updatedPicks = [...state.picks, newPick];

  return {
    ...state,
    wrestlers: updatedWrestlers,
    picks: updatedPicks,
  };
}

/**
 * Apply a pick_undone event to the current state.
 */
function applyPickUndone(
  state: DraftState,
  data: Record<string, unknown>,
): DraftState {
  const pickId = data.pickId as string;
  const wrestlerId = data.wrestlerId as string;

  // Mark wrestler as available again
  const updatedWrestlers = state.wrestlers.map((w) =>
    w.sessionWrestlerId === wrestlerId ? { ...w, isAvailable: true } : w,
  );

  // Remove the pick from history
  const updatedPicks = state.picks.filter((p) => p.id !== pickId);

  return {
    ...state,
    wrestlers: updatedWrestlers,
    picks: updatedPicks,
  };
}

/**
 * Apply a pick_reassigned event to the current state.
 */
function applyPickReassigned(
  state: DraftState,
  data: Record<string, unknown>,
): DraftState {
  const pickId = data.pickId as string;
  const oldWrestlerId = data.oldWrestlerId as string;
  const newWrestlerId = data.newWrestlerId as string;

  // Mark old wrestler as available, new wrestler as unavailable
  const updatedWrestlers = state.wrestlers.map((w) => {
    if (w.sessionWrestlerId === oldWrestlerId)
      return { ...w, isAvailable: true };
    if (w.sessionWrestlerId === newWrestlerId)
      return { ...w, isAvailable: false };
    return w;
  });

  // Update the pick in history
  const newWrestler = state.wrestlers.find(
    (w) => w.sessionWrestlerId === newWrestlerId,
  );
  const updatedPicks = state.picks.map((p) =>
    p.id === pickId
      ? {
          ...p,
          sessionWrestlerId: newWrestlerId,
          wrestlerName: newWrestler?.name ?? "Unknown",
          wrestlerSeed: newWrestler?.seed ?? 0,
          wrestlerTeam: newWrestler?.team ?? "",
        }
      : p,
  );

  return {
    ...state,
    wrestlers: updatedWrestlers,
    picks: updatedPicks,
  };
}

/**
 * Apply a turn_changed event to the current state.
 */
function applyTurnChanged(
  state: DraftState,
  data: Record<string, unknown>,
): DraftState {
  const playerId = data.playerId as string;
  const round = data.round as number;
  const pickNumber = data.pickNumber as number;

  const player = state.players.find((p) => p.id === playerId);

  return {
    ...state,
    session: {
      ...state.session,
      currentRound: round,
      currentPickNumber: pickNumber,
    },
    turn: {
      currentPlayerId: playerId,
      currentPlayerName: player?.name ?? null,
      round,
      pickNumber,
      draftOrderPosition: player?.draftOrder ?? state.turn.draftOrderPosition,
    },
  };
}

/**
 * Apply a draft_started event to the current state.
 */
function applyDraftStarted(state: DraftState): DraftState {
  return {
    ...state,
    session: { ...state.session, status: "active" },
  };
}

/**
 * Apply a draft_completed event to the current state.
 */
function applyDraftCompleted(state: DraftState): DraftState {
  return {
    ...state,
    session: { ...state.session, status: "completed" },
  };
}

/**
 * Apply a preselection_invalidated event to the current state.
 */
function applyPreselectionInvalidated(
  state: DraftState,
  data: Record<string, unknown>,
): DraftState {
  const playerId = data.playerId as string;

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, preSelectedWrestlerId: null } : p,
  );

  return { ...state, players: updatedPlayers };
}

/**
 * Apply an SSE event to the current draft state.
 * Returns the updated state, or null if the event type is unrecognized.
 */
export function applySSEEvent(
  state: DraftState,
  type: SSEEventType,
  data: Record<string, unknown>,
): DraftState {
  switch (type) {
    case "pick_made":
      return applyPickMade(state, data);
    case "pick_undone":
      return applyPickUndone(state, data);
    case "pick_reassigned":
      return applyPickReassigned(state, data);
    case "turn_changed":
      return applyTurnChanged(state, data);
    case "draft_started":
      return applyDraftStarted(state);
    case "draft_completed":
      return applyDraftCompleted(state);
    case "preselection_invalidated":
      return applyPreselectionInvalidated(state, data);
    default:
      return state;
  }
}

/**
 * Custom hook that maintains draft state via polling.
 *
 * Polls the REST state endpoint at a regular interval for updates.
 * Also attempts SSE for instant updates when available.
 * Implements exponential backoff for connection failures (1s, 2s, 4s, max 30s).
 */
function logPicksToLocalStorage(sessionId: string, state: DraftState) {
  try {
    const key = `draft-log-${sessionId}`;
    const log = {
      sessionId,
      sessionName: state.session.name,
      lastUpdated: new Date().toISOString(),
      status: state.session.status,
      currentRound: state.session.currentRound,
      currentPickNumber: state.session.currentPickNumber,
      picks: state.picks
        .slice()
        .sort((a, b) => a.pickNumber - b.pickNumber)
        .map((p) => ({
          pickNumber: p.pickNumber,
          round: p.round,
          playerName: p.playerName,
          wrestlerName: p.wrestlerName,
          wrestlerSeed: p.wrestlerSeed,
          weightClass: p.weightClass,
          timestamp: p.createdAt,
        })),
    };
    localStorage.setItem(key, JSON.stringify(log));
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

export function useDraftEvents(sessionId: string): UseDraftEventsReturn {
  const [state, setState] = useState<DraftState | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Persist picks to localStorage whenever they change
  useEffect(() => {
    if (state && state.picks.length > 0) {
      logPicksToLocalStorage(sessionId, state);
    }
  }, [sessionId, state?.picks.length, state]);

  const refresh = useCallback(async () => {
    try {
      const freshState = await fetchDraftState(sessionId);
      setState(freshState);
    } catch (err) {
      console.error("Failed to refresh draft state:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let backoff = INITIAL_BACKOFF_MS;
    let lastEventId: string | null = null;

    // Poll every 3 seconds for state updates (reliable on serverless)
    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        if (!mounted) return;
        try {
          const freshState = await fetchDraftState(sessionId);
          if (mounted) {
            setState(freshState);
          }
        } catch (err) {
          // Silently ignore poll errors — next poll will retry
        }
      }, 3000);
    }

    function connect() {
      if (!mounted) return;

      // Clean up any existing connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      setConnectionStatus("connecting");

      // Build URL with optional lastEventId for replay
      let url = `/api/draft/${sessionId}/events`;
      if (lastEventId) {
        url += `?lastEventId=${lastEventId}`;
      }

      const es = new EventSource(url);
      eventSource = es;

      es.onopen = () => {
        if (!mounted) return;
        setConnectionStatus("connected");
        backoff = INITIAL_BACKOFF_MS;
      };

      // Listen for each SSE event type
      const eventTypes: SSEEventType[] = [
        "pick_made",
        "pick_undone",
        "pick_reassigned",
        "draft_started",
        "draft_completed",
        "preselection_invalidated",
        "turn_changed",
      ];

      for (const eventType of eventTypes) {
        es.addEventListener(eventType, (event: MessageEvent) => {
          if (!mounted) return;

          // Track last event ID for reconnection
          if (event.lastEventId) {
            lastEventId = event.lastEventId;
          }

          try {
            const data = JSON.parse(event.data) as Record<string, unknown>;
            setState((prev) => {
              if (!prev) return prev;
              return applySSEEvent(prev, eventType, data);
            });
          } catch (err) {
            console.error(`Failed to parse SSE event (${eventType}):`, err);
          }
        });
      }

      es.onerror = () => {
        if (!mounted) return;

        es.close();
        eventSource = null;
        setConnectionStatus("disconnected");

        // Schedule reconnect with exponential backoff
        const delay = backoff;
        backoff = getNextBackoff(delay);

        reconnectTimer = setTimeout(async () => {
          if (!mounted) return;

          // On reconnect, fetch full state to ensure consistency
          try {
            const freshState = await fetchDraftState(sessionId);
            if (mounted) {
              setState(freshState);
            }
          } catch (err) {
            console.error("Failed to fetch state on reconnect:", err);
          }

          // Re-establish SSE connection
          connect();
        }, delay);
      };
    }

    // Initial state fetch
    fetchDraftState(sessionId)
      .then((initialState) => {
        if (mounted) {
          setState(initialState);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch initial draft state:", err);
      });

    // Start polling for reliable updates
    startPolling();

    // Also open SSE connection for instant updates when possible
    connect();

    return () => {
      mounted = false;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }, [sessionId]);

  return { state, connectionStatus, refresh };
}
