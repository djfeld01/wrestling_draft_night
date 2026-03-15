import { NextRequest } from "next/server";
import { subscribe, getEventsSince } from "../../../../../../lib/event-bus";
import type { SSEEvent } from "../../../../../../lib/event-types";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Format an SSEEvent into the wire format for Server-Sent Events.
 */
function formatSSE(event: SSEEvent): string {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const lastEventId =
    request.headers.get("Last-Event-ID") ??
    request.nextUrl.searchParams.get("lastEventId");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to push text to the stream
      function send(text: string) {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream may be closed; ignore
        }
      }

      // Replay missed events if reconnecting
      if (lastEventId) {
        const missed = getEventsSince(sessionId, lastEventId);
        for (const event of missed) {
          send(formatSSE(event));
        }
      }

      // Subscribe to live events
      const unsubscribe = subscribe(sessionId, (event: SSEEvent) => {
        send(formatSSE(event));
      });

      // Heartbeat to keep the connection alive
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up when the client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
