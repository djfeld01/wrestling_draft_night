import { describe, it, expect } from "vitest";
import { applySSEEvent, getNextBackoff } from "../../hooks/use-draft-events";
import type { DraftState } from "../../hooks/use-draft-events";

function makeDraftState(overrides?: Partial<DraftState>): DraftState {
  return {
    session: {
      id: "session-1",
      name: "Test Draft",
      status: "active",
      playerCount: 4,
      currentRound: 1,
      currentPickNumber: 1,
    },
    players: [
      { id: "p1", name: "Alice", draftOrder: 1, preSelectedWrestlerId: null },
      { id: "p2", name: "Bob", draftOrder: 2, preSelectedWrestlerId: null },
      { id: "p3", name: "Carol", draftOrder: 3, preSelectedWrestlerId: "sw3" },
      { id: "p4", name: "Dave", draftOrder: 4, preSelectedWrestlerId: null },
    ],
    wrestlers: [
      {
        sessionWrestlerId: "sw1",
        wrestlerId: "w1",
        name: "Wrestler A",
        team: "OSU",
        record: "30-0",
        seed: 1,
        weightClass: 125,
        grade: "Sr",
        scoring: "10.0",
        isAvailable: true,
      },
      {
        sessionWrestlerId: "sw2",
        wrestlerId: "w2",
        name: "Wrestler B",
        team: "PSU",
        record: "28-2",
        seed: 2,
        weightClass: 125,
        grade: "Jr",
        scoring: "8.5",
        isAvailable: true,
      },
      {
        sessionWrestlerId: "sw3",
        wrestlerId: "w3",
        name: "Wrestler C",
        team: "IOWA",
        record: "25-5",
        seed: 1,
        weightClass: 133,
        grade: "So",
        scoring: "9.0",
        isAvailable: true,
      },
    ],
    picks: [],
    turn: {
      currentPlayerId: "p1",
      currentPlayerName: "Alice",
      round: 1,
      pickNumber: 1,
      draftOrderPosition: 1,
    },
    ...overrides,
  };
}

describe("getNextBackoff", () => {
  it("doubles the backoff each time", () => {
    expect(getNextBackoff(1000)).toBe(2000);
    expect(getNextBackoff(2000)).toBe(4000);
    expect(getNextBackoff(4000)).toBe(8000);
  });

  it("caps at 30 seconds", () => {
    expect(getNextBackoff(16000)).toBe(30000);
    expect(getNextBackoff(30000)).toBe(30000);
  });
});

describe("applySSEEvent", () => {
  describe("pick_made", () => {
    it("marks wrestler unavailable and appends to pick history", () => {
      const state = makeDraftState();
      const result = applySSEEvent(state, "pick_made", {
        pickId: "pick-1",
        playerId: "p1",
        wrestlerId: "sw1",
        weightClass: 125,
        round: 1,
        pickNumber: 1,
      });

      const wrestler = result.wrestlers.find(
        (w) => w.sessionWrestlerId === "sw1",
      );
      expect(wrestler?.isAvailable).toBe(false);
      expect(result.picks).toHaveLength(1);
      expect(result.picks[0].playerName).toBe("Alice");
      expect(result.picks[0].wrestlerName).toBe("Wrestler A");
      expect(result.picks[0].weightClass).toBe(125);
    });

    it("does not modify other wrestlers", () => {
      const state = makeDraftState();
      const result = applySSEEvent(state, "pick_made", {
        pickId: "pick-1",
        playerId: "p1",
        wrestlerId: "sw1",
        weightClass: 125,
        round: 1,
        pickNumber: 1,
      });

      const otherWrestler = result.wrestlers.find(
        (w) => w.sessionWrestlerId === "sw2",
      );
      expect(otherWrestler?.isAvailable).toBe(true);
    });
  });

  describe("pick_undone", () => {
    it("marks wrestler available and removes pick from history", () => {
      const state = makeDraftState({
        wrestlers: [
          {
            sessionWrestlerId: "sw1",
            wrestlerId: "w1",
            name: "Wrestler A",
            team: "OSU",
            record: "30-0",
            seed: 1,
            weightClass: 125,
            grade: "Sr",
            scoring: "10.0",
            isAvailable: false,
          },
        ],
        picks: [
          {
            id: "pick-1",
            playerId: "p1",
            playerName: "Alice",
            sessionWrestlerId: "sw1",
            wrestlerName: "Wrestler A",
            wrestlerSeed: 1,
            wrestlerTeam: "OSU",
            weightClass: 125,
            round: 1,
            pickNumber: 1,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const result = applySSEEvent(state, "pick_undone", {
        pickId: "pick-1",
        wrestlerId: "sw1",
        playerId: "p1",
      });

      expect(result.wrestlers[0].isAvailable).toBe(true);
      expect(result.picks).toHaveLength(0);
    });
  });

  describe("pick_reassigned", () => {
    it("swaps wrestler availability and updates pick record", () => {
      const state = makeDraftState({
        wrestlers: [
          {
            sessionWrestlerId: "sw1",
            wrestlerId: "w1",
            name: "Wrestler A",
            team: "OSU",
            record: "30-0",
            seed: 1,
            weightClass: 125,
            grade: "Sr",
            scoring: "10.0",
            isAvailable: false,
          },
          {
            sessionWrestlerId: "sw2",
            wrestlerId: "w2",
            name: "Wrestler B",
            team: "PSU",
            record: "28-2",
            seed: 2,
            weightClass: 125,
            grade: "Jr",
            scoring: "8.5",
            isAvailable: true,
          },
        ],
        picks: [
          {
            id: "pick-1",
            playerId: "p1",
            playerName: "Alice",
            sessionWrestlerId: "sw1",
            wrestlerName: "Wrestler A",
            wrestlerSeed: 1,
            wrestlerTeam: "OSU",
            weightClass: 125,
            round: 1,
            pickNumber: 1,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const result = applySSEEvent(state, "pick_reassigned", {
        pickId: "pick-1",
        oldWrestlerId: "sw1",
        newWrestlerId: "sw2",
      });

      expect(
        result.wrestlers.find((w) => w.sessionWrestlerId === "sw1")
          ?.isAvailable,
      ).toBe(true);
      expect(
        result.wrestlers.find((w) => w.sessionWrestlerId === "sw2")
          ?.isAvailable,
      ).toBe(false);
      expect(result.picks[0].sessionWrestlerId).toBe("sw2");
      expect(result.picks[0].wrestlerName).toBe("Wrestler B");
    });
  });

  describe("turn_changed", () => {
    it("updates session round, pick number, and turn info", () => {
      const state = makeDraftState();
      const result = applySSEEvent(state, "turn_changed", {
        playerId: "p2",
        round: 1,
        pickNumber: 2,
      });

      expect(result.session.currentRound).toBe(1);
      expect(result.session.currentPickNumber).toBe(2);
      expect(result.turn.currentPlayerId).toBe("p2");
      expect(result.turn.currentPlayerName).toBe("Bob");
      expect(result.turn.pickNumber).toBe(2);
    });
  });

  describe("draft_started", () => {
    it("sets session status to active", () => {
      const state = makeDraftState({
        session: {
          id: "session-1",
          name: "Test Draft",
          status: "setup",
          playerCount: 4,
          currentRound: 1,
          currentPickNumber: 1,
        },
      });
      const result = applySSEEvent(state, "draft_started", {
        sessionId: "session-1",
      });
      expect(result.session.status).toBe("active");
    });
  });

  describe("draft_completed", () => {
    it("sets session status to completed", () => {
      const state = makeDraftState();
      const result = applySSEEvent(state, "draft_completed", {
        sessionId: "session-1",
      });
      expect(result.session.status).toBe("completed");
    });
  });

  describe("preselection_invalidated", () => {
    it("clears the pre-selection for the specified player", () => {
      const state = makeDraftState();
      expect(state.players[2].preSelectedWrestlerId).toBe("sw3");

      const result = applySSEEvent(state, "preselection_invalidated", {
        playerId: "p3",
        wrestlerId: "sw3",
      });

      expect(result.players[2].preSelectedWrestlerId).toBeNull();
      // Other players unaffected
      expect(result.players[0].preSelectedWrestlerId).toBeNull();
    });
  });
});
