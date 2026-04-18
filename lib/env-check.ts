import logger from "./logger";

/**
 * Server-side startup check — called in app/layout.tsx.
 * Warns loudly at dev time if required environment variables are missing.
 * At runtime (when handling requests) the API route will return a 503 if ANTHROPIC_API_KEY is absent.
 */
export function checkServerEnv() {
  // Skip during next build — env vars are injected at runtime, not build time
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const required = ["ANTHROPIC_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn({ missing }, "Missing required environment variables — copy .env.example → .env and fill in the values");
  }
}
