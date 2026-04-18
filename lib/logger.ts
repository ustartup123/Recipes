import pino, { type Logger } from "pino";

/**
 * Root logger.
 *
 * In dev: human-readable line per log, pretty-ish.
 * In prod (Vercel): one JSON line per log — searchable via `vercel logs`.
 *   Fields we standardize on:
 *     - level, msg, time (pino defaults)
 *     - reqId: uuid per request (set by withRequest)
 *     - route: API path (set by withRequest)
 *     - userId: Firebase uid (set per-request once known)
 *     - durationMs: for "…done" messages
 *     - err: serialized Error (use `serializeError`)
 *
 * To tail in production:  npx vercel logs recipes --follow
 * Filter a single request:  ... | grep <reqId>
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { app: "recipes-app" },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    },
    formatters: {
      level: (label: string) => ({ level: label }),
    },
  }),
});

export default logger;

/**
 * Build a request-scoped child logger. Call once at the top of each API route:
 *
 *   const log = withRequest(logger, req, "parse-url");
 *   log.info("start");
 *   ...
 *   log.info({ durationMs }, "done");
 *
 * Every log line from that child carries `reqId` + `route`, so a grep on the
 * reqId gives the full trace.
 */
export function withRequest(
  base: Logger,
  req: Request,
  route: string,
): Logger {
  const reqId =
    req.headers.get("x-request-id") ||
    req.headers.get("x-vercel-id") ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));
  return base.child({ reqId, route, method: req.method });
}

/** Stable, JSON-friendly error shape. Use as `{ err: serializeError(e) }`. */
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      // carry over useful custom fields (e.g. GeminiError.status)
      ...(typeof (err as { status?: unknown }).status === "number"
        ? { status: (err as { status: number }).status }
        : {}),
      ...(typeof (err as { originalMessage?: unknown }).originalMessage ===
      "string"
        ? {
            originalMessage: (err as { originalMessage: string })
              .originalMessage,
          }
        : {}),
    };
  }
  return { message: String(err) };
}

/** Returns elapsed ms since `start` (from `performance.now()` or Date.now()). */
export function elapsedMs(start: number): number {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.round(now - start);
}

/** Convenience: capture a start timestamp for `elapsedMs`. */
export function startTimer(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
