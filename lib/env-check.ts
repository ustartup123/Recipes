import logger from "./logger";

/**
 * Server-side startup check — called from app/layout.tsx.
 * Warns loudly at dev time if required environment variables are missing.
 * Add server-side keys you depend on (Stripe, OpenAI, Gemini, etc.) to
 * the `required` array.
 */
export function checkServerEnv() {
  // Skip during next build — env vars are injected at runtime, not build time
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const required: string[] = [
    // Add server-only secrets here, e.g. "GEMINI_API_KEY"
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn(
      { missing },
      "Missing required environment variables — copy .env.example → .env and fill in the values"
    );
  }
}
