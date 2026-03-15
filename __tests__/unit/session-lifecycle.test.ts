import { describe, it, expect } from "vitest";

/**
 * Unit tests for session lifecycle transition validation logic.
 * These test the pure validation rules without database dependencies.
 */

type SessionStatus = "setup" | "active" | "completed";

// Extract the validation logic that startSession and completeSession use
function validateStartSession(
  session: { status: SessionStatus } | null,
  playerCount: number,
): { valid: true } | { valid: false; error: string } {
  if (!session) {
    return { valid: false, error: "Draft session not found" };
  }
  if (session.status !== "setup") {
    return { valid: false, error: "Draft session is not in setup status" };
  }
  if (playerCount < 2) {
    return {
      valid: false,
      error: "At least 2 players are required to start a draft session",
    };
  }
  return { valid: true };
}

function validateCompleteSession(
  session: { status: SessionStatus } | null,
): { valid: true } | { valid: false; error: string } {
  if (!session) {
    return { valid: false, error: "Draft session not found" };
  }
  if (session.status !== "active") {
    return { valid: false, error: "Draft session is not in active status" };
  }
  return { valid: true };
}

describe("Session lifecycle transitions", () => {
  describe("startSession validation", () => {
    it("succeeds when session is in setup status with enough players", () => {
      const result = validateStartSession({ status: "setup" }, 4);
      expect(result).toEqual({ valid: true });
    });

    it("rejects when session is not found", () => {
      const result = validateStartSession(null, 4);
      expect(result).toEqual({
        valid: false,
        error: "Draft session not found",
      });
    });

    it("rejects when session is already active", () => {
      const result = validateStartSession({ status: "active" }, 4);
      expect(result).toEqual({
        valid: false,
        error: "Draft session is not in setup status",
      });
    });

    it("rejects when session is already completed", () => {
      const result = validateStartSession({ status: "completed" }, 4);
      expect(result).toEqual({
        valid: false,
        error: "Draft session is not in setup status",
      });
    });

    it("rejects when fewer than 2 players exist", () => {
      const result = validateStartSession({ status: "setup" }, 1);
      expect(result).toEqual({
        valid: false,
        error: "At least 2 players are required to start a draft session",
      });
    });

    it("rejects when zero players exist", () => {
      const result = validateStartSession({ status: "setup" }, 0);
      expect(result).toEqual({
        valid: false,
        error: "At least 2 players are required to start a draft session",
      });
    });

    it("succeeds with exactly 2 players", () => {
      const result = validateStartSession({ status: "setup" }, 2);
      expect(result).toEqual({ valid: true });
    });
  });

  describe("completeSession validation", () => {
    it("succeeds when session is active", () => {
      const result = validateCompleteSession({ status: "active" });
      expect(result).toEqual({ valid: true });
    });

    it("rejects when session is not found", () => {
      const result = validateCompleteSession(null);
      expect(result).toEqual({
        valid: false,
        error: "Draft session not found",
      });
    });

    it("rejects when session is in setup status", () => {
      const result = validateCompleteSession({ status: "setup" });
      expect(result).toEqual({
        valid: false,
        error: "Draft session is not in active status",
      });
    });

    it("rejects when session is already completed", () => {
      const result = validateCompleteSession({ status: "completed" });
      expect(result).toEqual({
        valid: false,
        error: "Draft session is not in active status",
      });
    });
  });

  describe("State machine transitions", () => {
    it("only allows setup -> active transition", () => {
      const statuses: SessionStatus[] = ["setup", "active", "completed"];
      for (const status of statuses) {
        const result = validateStartSession({ status }, 4);
        if (status === "setup") {
          expect(result).toEqual({ valid: true });
        } else {
          expect(result).toHaveProperty("valid", false);
        }
      }
    });

    it("only allows active -> completed transition", () => {
      const statuses: SessionStatus[] = ["setup", "active", "completed"];
      for (const status of statuses) {
        const result = validateCompleteSession({ status });
        if (status === "active") {
          expect(result).toEqual({ valid: true });
        } else {
          expect(result).toHaveProperty("valid", false);
        }
      }
    });
  });
});
