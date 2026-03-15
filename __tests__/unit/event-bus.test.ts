import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  subscribe,
  publish,
  broadcastEvent,
  getEventsSince,
} from "../../lib/event-bus";
import type { SSEEvent } from "../../lib/event-types";

/**
 * We need to reset the module-level state between tests.
 * Since the maps are module-scoped, we re-import via vi.resetModules().
 */

describe("event-bus", () => {
  // Use dynamic imports to get fresh module state per test
  let bus: typeof import("../../lib/event-bus");

  beforeEach(async () => {
    vi.resetModules();
    bus = await import("../../lib/event-bus");
  });

  describe("subscribe / publish", () => {
    it("delivers events to subscribers for the correct session", async () => {
      const received: SSEEvent[] = [];
      bus.subscribe("session-1", (e) => received.push(e));

      const event: SSEEvent = {
        id: "1",
        type: "pick_made",
        data: { pickId: "p1" },
      };
      bus.publish("session-1", event);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(event);
    });

    it("does not deliver events to subscribers of a different session", async () => {
      const received: SSEEvent[] = [];
      bus.subscribe("session-2", (e) => received.push(e));

      bus.publish("session-1", {
        id: "1",
        type: "pick_made",
        data: {},
      });

      expect(received).toHaveLength(0);
    });

    it("supports multiple subscribers per session", async () => {
      const received1: SSEEvent[] = [];
      const received2: SSEEvent[] = [];
      bus.subscribe("s1", (e) => received1.push(e));
      bus.subscribe("s1", (e) => received2.push(e));

      bus.publish("s1", { id: "1", type: "draft_started", data: {} });

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
    });

    it("unsubscribe removes the subscriber", async () => {
      const received: SSEEvent[] = [];
      const unsub = bus.subscribe("s1", (e) => received.push(e));

      bus.publish("s1", { id: "1", type: "draft_started", data: {} });
      expect(received).toHaveLength(1);

      unsub();

      bus.publish("s1", { id: "2", type: "draft_completed", data: {} });
      expect(received).toHaveLength(1); // no new events
    });
  });

  describe("getEventsSince", () => {
    it("returns events after the given ID", async () => {
      bus.publish("s1", { id: "1", type: "pick_made", data: { a: 1 } });
      bus.publish("s1", { id: "2", type: "pick_made", data: { a: 2 } });
      bus.publish("s1", { id: "3", type: "pick_made", data: { a: 3 } });

      const missed = bus.getEventsSince("s1", "1");
      expect(missed).toHaveLength(2);
      expect(missed[0].id).toBe("2");
      expect(missed[1].id).toBe("3");
    });

    it("returns empty array for unknown session", async () => {
      expect(bus.getEventsSince("unknown", "1")).toEqual([]);
    });

    it("returns empty array for non-numeric lastEventId", async () => {
      bus.publish("s1", { id: "1", type: "pick_made", data: {} });
      expect(bus.getEventsSince("s1", "abc")).toEqual([]);
    });

    it("returns all events when lastEventId is 0", async () => {
      bus.publish("s1", { id: "1", type: "pick_made", data: {} });
      bus.publish("s1", { id: "2", type: "pick_undone", data: {} });

      const all = bus.getEventsSince("s1", "0");
      expect(all).toHaveLength(2);
    });
  });

  describe("broadcastEvent", () => {
    it("assigns incrementing IDs and delivers to subscribers", async () => {
      const received: SSEEvent[] = [];
      bus.subscribe("s1", (e) => received.push(e));

      bus.broadcastEvent("s1", "pick_made", { pickId: "p1" });
      bus.broadcastEvent("s1", "turn_changed", { playerId: "pl1" });

      expect(received).toHaveLength(2);
      expect(received[0].id).toBe("1");
      expect(received[0].type).toBe("pick_made");
      expect(received[1].id).toBe("2");
      expect(received[1].type).toBe("turn_changed");
    });

    it("stores events in buffer for replay", async () => {
      bus.broadcastEvent("s1", "draft_started", { sessionId: "s1" });
      bus.broadcastEvent("s1", "pick_made", { pickId: "p1" });

      const events = bus.getEventsSince("s1", "0");
      expect(events).toHaveLength(2);
    });
  });

  describe("buffer overflow", () => {
    it("keeps only the last 100 events", async () => {
      // Publish 105 events
      for (let i = 1; i <= 105; i++) {
        bus.publish("s1", {
          id: String(i),
          type: "pick_made",
          data: { i },
        });
      }

      // Buffer should have events 6..105 (last 100)
      const all = bus.getEventsSince("s1", "0");
      expect(all).toHaveLength(100);
      expect(all[0].id).toBe("6");
      expect(all[99].id).toBe("105");
    });
  });
});
