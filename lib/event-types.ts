/**
 * SSE event type definitions for real-time draft synchronization.
 */

export type SSEEventType =
  | "pick_made"
  | "pick_undone"
  | "pick_reassigned"
  | "draft_started"
  | "draft_completed"
  | "preselection_invalidated"
  | "turn_changed";

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  data: Record<string, unknown>;
}
