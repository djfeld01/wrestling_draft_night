"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DraftState } from "../src/app/api/draft/[sessionId]/state/route";
import {
  selectBestWrestler,
  type DraftMode,
  type AutoDraftRanking,
} from "../lib/auto-draft";
import { makeProxyPick } from "../actions/draft";
import rankings from "../lib/auto-draft-rankings.json";

export type AutoDraftRunStatus = "idle" | "running" | "paused";

export interface UseAutoDraftReturn {
  autoPlayers: Set<string>;
  toggleAutoPlayer: (playerId: string) => void;
  autoPickCurrent: () => Promise<void>;
  startFullAutoDraft: () => void;
  pauseFullAutoDraft: () => void;
  cancelFullAutoDraft: () => void;
  runStatus: AutoDraftRunStatus;
  draftMode: DraftMode;
  setDraftMode: (mode: DraftMode) => void;
  pickDelay: number;
  setPickDelay: (ms: number) => void;
  lastError: string | null;
  isPicking: boolean;
}

export function useAutoDraft(
  sessionId: string,
  state: DraftState | null,
): UseAutoDraftReturn {
  const [autoPlayers, setAutoPlayers] = useState<Set<string>>(new Set());
  const [runStatus, setRunStatus] = useState<AutoDraftRunStatus>("idle");
  const [draftMode, setDraftMode] = useState<DraftMode>("smart");
  const [pickDelay, setPickDelay] = useState(2000);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runStatusRef = useRef(runStatus);
  const stateRef = useRef(state);
  const isPickingRef = useRef(false);

  // Keep refs in sync
  runStatusRef.current = runStatus;
  stateRef.current = state;
  isPickingRef.current = isPicking;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const toggleAutoPlayer = useCallback((playerId: string) => {
    setAutoPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const autoPickCurrent = useCallback(async () => {
    if (!stateRef.current) return;
    if (stateRef.current.session.status !== "active") {
      setRunStatus("idle");
      return;
    }
    if (isPickingRef.current) return;

    const currentPlayerId = stateRef.current.turn.currentPlayerId;
    if (!currentPlayerId) return;

    setIsPicking(true);
    setLastError(null);

    try {
      const wrestlerId = selectBestWrestler(
        stateRef.current,
        currentPlayerId,
        draftMode,
        rankings as AutoDraftRanking[],
      );

      if (!wrestlerId) {
        setLastError("No valid pick available for this player.");
        setIsPicking(false);
        if (runStatusRef.current === "running") {
          setRunStatus("paused");
        }
        return;
      }

      const result = await makeProxyPick(sessionId, wrestlerId);

      if (!result.success) {
        // Race condition — retry once with fresh state after a short wait
        await new Promise((r) => setTimeout(r, 500));
        if (!stateRef.current || stateRef.current.session.status !== "active") {
          setIsPicking(false);
          return;
        }

        const retryId = selectBestWrestler(
          stateRef.current,
          currentPlayerId,
          draftMode,
          rankings as AutoDraftRanking[],
        );

        if (!retryId) {
          setLastError("No valid pick available after retry.");
          if (runStatusRef.current === "running") setRunStatus("paused");
          setIsPicking(false);
          return;
        }

        const retryResult = await makeProxyPick(sessionId, retryId);
        if (!retryResult.success) {
          setLastError(retryResult.error);
          if (runStatusRef.current === "running") setRunStatus("paused");
          setIsPicking(false);
          return;
        }
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Auto-pick failed.");
      if (runStatusRef.current === "running") setRunStatus("paused");
    } finally {
      setIsPicking(false);
    }
  }, [sessionId, draftMode]);

  const startFullAutoDraft = useCallback(() => {
    setLastError(null);
    setRunStatus("running");
  }, []);

  const pauseFullAutoDraft = useCallback(() => {
    setRunStatus("paused");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelFullAutoDraft = useCallback(() => {
    setRunStatus("idle");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Watch for state changes and trigger auto-picks
  useEffect(() => {
    if (!state) return;
    if (state.session.status !== "active") {
      if (runStatusRef.current === "running") {
        setRunStatus("idle");
      }
      return;
    }
    if (isPickingRef.current) return;

    const currentPlayerId = state.turn.currentPlayerId;
    if (!currentPlayerId) return;

    const shouldAutoPick =
      runStatusRef.current === "running" || autoPlayers.has(currentPlayerId);

    if (!shouldAutoPick) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      autoPickCurrent();
    }, pickDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state, autoPlayers, runStatus, pickDelay, autoPickCurrent]);

  return {
    autoPlayers,
    toggleAutoPlayer,
    autoPickCurrent,
    startFullAutoDraft,
    pauseFullAutoDraft,
    cancelFullAutoDraft,
    runStatus,
    draftMode,
    setDraftMode,
    pickDelay,
    setPickDelay,
    lastError,
    isPicking,
  };
}
