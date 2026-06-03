/**
 * AI Stream SSE utilities
 * Provides helpers to build Server-Sent Events responses for AI generation tasks.
 */

export interface AIProgressEvent {
  type: "progress";
  stage: string;
  progress: number; // 0-100
  message: string;
}

export interface AICompleteEvent {
  type: "complete";
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AIErrorEvent {
  type: "error";
  error: string;
}

export type AIStreamEvent = AIProgressEvent | AICompleteEvent | AIErrorEvent;

const encoder = new TextEncoder();

export function sendProgress(
  controller: ReadableStreamDefaultController,
  stage: string,
  progress: number,
  message: string
) {
  const event: AIProgressEvent = { type: "progress", stage, progress, message };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendComplete(
  controller: ReadableStreamDefaultController,
  success: boolean,
  data?: unknown,
  error?: string
) {
  const event: AICompleteEvent = { type: "complete", success, data, error };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendError(controller: ReadableStreamDefaultController, error: string) {
  const event: AIErrorEvent = { type: "error", error };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function createAIStream(
  executor: (send: {
    progress: (stage: string, p: number, message: string) => void;
    complete: (success: boolean, data?: unknown, error?: string) => void;
    error: (message: string) => void;
  }) => Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await executor({
          progress: (stage, progress, message) =>
            sendProgress(controller, stage, progress, message),
          complete: (success, data, error) =>
            sendComplete(controller, success, data, error),
          error: (message) => sendError(controller, message),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "未知错误";
        sendError(controller, msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Check if request wants SSE stream */
export function wantsStream(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  const url = new URL(request.url);
  return (
    accept.includes("text/event-stream") || url.searchParams.get("stream") === "1"
  );
}
