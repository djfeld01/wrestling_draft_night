/**
 * In-memory event bus for SSE broadcasting.
 *
 * Maintains per-session subscriber lists and a rolling event buffer
 * for Last-Event-ID replay on reconnection.
 */

import { SSEEvent, SSEEventType } from "./event-types";

type Subscriber = (event: SSEEvent) => void;

const BUFFER_SIZE = 100;

/** Per-session subscriber sets */
const subscribers = new Map<string, Set<Subscriber>>();

/** Per-session rolling event buffers */
const eventBuffers = new Map<string, SSEEvent[]>();

/** Per-session incrementing event ID counters */
const eventCounters = new Map<string, number>();

/**
 * Subscribe to events for a given session.
 * Returns an unsubscribe function.
 */
export function subscribe(sessionId: string, callback: Subscriber): () => void {
  if (!subscribers.has(sessionId)) {
    subscribers.set(sessionId, new Set());
  }
  subscribers.get(sessionId)!.add(callback);

  return () => {
    const subs = subscribers.get(sessionId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(sessionId);
      }
    }
  };
}

/**
 * Publish an event to all subscribers for a session.
 * Also stores the event in the rolling buffer for replay.
 */
export function publish(sessionId: string, event: SSEEvent): void {
  // Store in buffer
  if (!eventBuffers.has(sessionId)) {
    eventBuffers.set(sessionId, []);
  }
  const buffer = eventBuffers.get(sessionId)!;
  buffer.push(event);
  if (buffer.length > BUFFER_SIZE) {
    buffer.shift();
  }

  // Notify all subscribers
  const subs = subscribers.get(sessionId);
  if (subs) {
    for (const callback of subs) {
      callback(event);
    }
  }
}

/**
 * Get the next event ID for a session (incrementing counter).
 */
function getNextEventId(sessionId: string): string {
  const current = eventCounters.get(sessionId) ?? 0;
  const next = current + 1;
  eventCounters.set(sessionId, next);
  return String(next);
}

/**
 * Get events after a given event ID for replay on reconnection.
 * Returns events with ID greater than the provided lastEventId.
 */
export function getEventsSince(
  sessionId: string,
  lastEventId: string,
): SSEEvent[] {
  const buffer = eventBuffers.get(sessionId);
  if (!buffer) return [];

  const lastId = parseInt(lastEventId, 10);
  if (isNaN(lastId)) return [];

  return buffer.filter((event) => {
    const eventId = parseInt(event.id, 10);
    return !isNaN(eventId) && eventId > lastId;
  });
}

/**
 * High-level helper for server actions to broadcast an event after DB writes.
 * Assigns an auto-incrementing event ID and publishes to all subscribers.
 */
export function broadcastEvent(
  sessionId: string,
  type: SSEEventType,
  data: Record<string, unknown>,
): void {
  const id = getNextEventId(sessionId);
  publish(sessionId, { id, type, data });
}
