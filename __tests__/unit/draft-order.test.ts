import { describe, it, expect } from "vitest";
import {
  getCurrentDraftPosition,
  getTotalPicks,
  isRoundComplete,
  getNextPickNumber,
} from "../../lib/draft-order";

describe("getCurrentDraftPosition", () => {
  describe("odd rounds (ascending order)", () => {
    it("returns positions 1→N for round 1 with 4 players", () => {
      const N = 4;
      // Picks 1-4 are round 1
      expect(getCurrentDraftPosition(1, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(2, N).draftOrderPosition).toBe(2);
      expect(getCurrentDraftPosition(3, N).draftOrderPosition).toBe(3);
      expect(getCurrentDraftPosition(4, N).draftOrderPosition).toBe(4);
    });

    it("returns ascending order for round 3 with 4 players", () => {
      const N = 4;
      // Round 3: picks 9-12
      expect(getCurrentDraftPosition(9, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(10, N).draftOrderPosition).toBe(2);
      expect(getCurrentDraftPosition(11, N).draftOrderPosition).toBe(3);
      expect(getCurrentDraftPosition(12, N).draftOrderPosition).toBe(4);
    });
  });

  describe("even rounds (descending order)", () => {
    it("returns positions N→1 for round 2 with 4 players", () => {
      const N = 4;
      // Round 2: picks 5-8
      expect(getCurrentDraftPosition(5, N).draftOrderPosition).toBe(4);
      expect(getCurrentDraftPosition(6, N).draftOrderPosition).toBe(3);
      expect(getCurrentDraftPosition(7, N).draftOrderPosition).toBe(2);
      expect(getCurrentDraftPosition(8, N).draftOrderPosition).toBe(1);
    });

    it("returns descending order for round 4 with 4 players", () => {
      const N = 4;
      // Round 4: picks 13-16
      expect(getCurrentDraftPosition(13, N).draftOrderPosition).toBe(4);
      expect(getCurrentDraftPosition(14, N).draftOrderPosition).toBe(3);
      expect(getCurrentDraftPosition(15, N).draftOrderPosition).toBe(2);
      expect(getCurrentDraftPosition(16, N).draftOrderPosition).toBe(1);
    });
  });

  describe("round calculation", () => {
    it("correctly identifies round numbers", () => {
      const N = 4;
      expect(getCurrentDraftPosition(1, N).round).toBe(1);
      expect(getCurrentDraftPosition(4, N).round).toBe(1);
      expect(getCurrentDraftPosition(5, N).round).toBe(2);
      expect(getCurrentDraftPosition(8, N).round).toBe(2);
      expect(getCurrentDraftPosition(9, N).round).toBe(3);
      expect(getCurrentDraftPosition(40, N).round).toBe(10);
    });
  });

  describe("various player counts", () => {
    it("works with 2 players", () => {
      const N = 2;
      // Round 1: pick 1→pos 1, pick 2→pos 2
      expect(getCurrentDraftPosition(1, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(2, N).draftOrderPosition).toBe(2);
      // Round 2: pick 3→pos 2, pick 4→pos 1
      expect(getCurrentDraftPosition(3, N).draftOrderPosition).toBe(2);
      expect(getCurrentDraftPosition(4, N).draftOrderPosition).toBe(1);
    });

    it("works with 10 players", () => {
      const N = 10;
      // Round 1 first and last
      expect(getCurrentDraftPosition(1, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(10, N).draftOrderPosition).toBe(10);
      // Round 2 first and last (descending)
      expect(getCurrentDraftPosition(11, N).draftOrderPosition).toBe(10);
      expect(getCurrentDraftPosition(20, N).draftOrderPosition).toBe(1);
    });

    it("works with 12 players", () => {
      const N = 12;
      // Round 1: ascending
      expect(getCurrentDraftPosition(1, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(12, N).draftOrderPosition).toBe(12);
      // Round 2: descending
      expect(getCurrentDraftPosition(13, N).draftOrderPosition).toBe(12);
      expect(getCurrentDraftPosition(24, N).draftOrderPosition).toBe(1);
    });

    it("works with 16 players", () => {
      const N = 16;
      // Round 1: ascending
      expect(getCurrentDraftPosition(1, N).draftOrderPosition).toBe(1);
      expect(getCurrentDraftPosition(16, N).draftOrderPosition).toBe(16);
      // Round 2: descending
      expect(getCurrentDraftPosition(17, N).draftOrderPosition).toBe(16);
      expect(getCurrentDraftPosition(32, N).draftOrderPosition).toBe(1);
    });
  });

  describe("snake continuity at round boundaries", () => {
    it("last pick of odd round and first pick of even round are the same position", () => {
      const N = 4;
      // Last pick of round 1 (odd): position N
      expect(getCurrentDraftPosition(4, N).draftOrderPosition).toBe(4);
      // First pick of round 2 (even): also position N
      expect(getCurrentDraftPosition(5, N).draftOrderPosition).toBe(4);
    });

    it("last pick of even round and first pick of odd round are the same position", () => {
      const N = 4;
      // Last pick of round 2 (even): position 1
      expect(getCurrentDraftPosition(8, N).draftOrderPosition).toBe(1);
      // First pick of round 3 (odd): also position 1
      expect(getCurrentDraftPosition(9, N).draftOrderPosition).toBe(1);
    });
  });
});

describe("getTotalPicks", () => {
  it("returns playerCount × 10", () => {
    expect(getTotalPicks(2)).toBe(20);
    expect(getTotalPicks(4)).toBe(40);
    expect(getTotalPicks(10)).toBe(100);
    expect(getTotalPicks(12)).toBe(120);
    expect(getTotalPicks(16)).toBe(160);
  });
});

describe("isRoundComplete", () => {
  it("returns true at end of round", () => {
    expect(isRoundComplete(4, 4)).toBe(true);
    expect(isRoundComplete(8, 4)).toBe(true);
    expect(isRoundComplete(12, 4)).toBe(true);
    expect(isRoundComplete(10, 10)).toBe(true);
  });

  it("returns false mid-round", () => {
    expect(isRoundComplete(1, 4)).toBe(false);
    expect(isRoundComplete(3, 4)).toBe(false);
    expect(isRoundComplete(5, 4)).toBe(false);
    expect(isRoundComplete(7, 10)).toBe(false);
  });
});

describe("getNextPickNumber", () => {
  it("returns current + 1", () => {
    expect(getNextPickNumber(1)).toBe(2);
    expect(getNextPickNumber(10)).toBe(11);
    expect(getNextPickNumber(99)).toBe(100);
  });
});
