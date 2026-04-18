/**
 * Gemini API helpers: retry with exponential backoff + error classification.
 *
 * Usage:
 *   import { callGeminiWithRetry, handleGeminiError } from "@/lib/gemini";
 *   const text = await callGeminiWithRetry(() => model.generateContent(parts));
 */

import type { GenerateContentResult } from "@google/generative-ai";

const GEMINI_MAX_RETRIES = 3;
const GEMINI_BASE_DELAY_MS = 1000; // 1s → 2s → 4s exponential backoff

/** Errors worth retrying (transient / capacity). */
function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("Service Unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  );
}

export interface ClassifiedError {
  status: number;
  userMessage: string;
}

/** Map a raw Gemini error to a user-friendly status + message. */
export function classifyGeminiError(error: unknown): ClassifiedError {
  const msg = error instanceof Error ? error.message : String(error);

  if (
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded")
  ) {
    return { status: 503, userMessage: "AI service is currently overloaded. Try again in a minute." };
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return { status: 429, userMessage: "Rate limit exceeded. Try again in a minute." };
  }
  if (msg.includes("400") || msg.includes("INVALID_ARGUMENT")) {
    return { status: 400, userMessage: "Problem processing content. Try again or use a different input." };
  }
  if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) {
    return { status: 500, userMessage: "Server configuration issue. Contact admin." };
  }
  return { status: 500, userMessage: "Processing error. Please try again." };
}

/**
 * Custom error thrown after retries are exhausted (or on non-retryable errors).
 * Carries a user-safe message and HTTP status so route handlers can forward it.
 */
export class GeminiError extends Error {
  status: number;
  originalMessage: string;

  constructor(classified: ClassifiedError, originalError: unknown) {
    super(classified.userMessage);
    this.name = "GeminiError";
    this.status = classified.status;
    this.originalMessage =
      originalError instanceof Error ? originalError.message : String(originalError);
  }
}

/** Minimal logger shape (kept loose to stay compatible with existing callers). */
type RetryLog = {
  info?: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

/**
 * Call Gemini with automatic retry + exponential backoff for transient errors.
 *
 * @param fn  – a zero-arg async function that calls `model.generateContent(…)`
 * @param log – optional Pino-style logger for retry / outcome info
 * @returns     the GenerateContentResult on success
 * @throws      GeminiError with classified status/message on failure
 */
export async function callGeminiWithRetry(
  fn: () => Promise<GenerateContentResult>,
  log?: RetryLog,
): Promise<GenerateContentResult> {
  let lastError: unknown;
  const start = Date.now();

  if (log?.info) {
    log.info({ maxRetries: GEMINI_MAX_RETRIES }, "gemini: call start");
  }

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const res = await fn();
      if (log?.info) {
        log.info(
          { attempt: attempt + 1, durationMs: Date.now() - start },
          "gemini: call ok",
        );
      }
      return res;
    } catch (error) {
      lastError = error;

      if (attempt < GEMINI_MAX_RETRIES && isRetryableError(error)) {
        const delay = GEMINI_BASE_DELAY_MS * Math.pow(2, attempt);
        const msg = error instanceof Error ? error.message : String(error);
        if (log) {
          log.warn(
            `[Gemini] Attempt ${attempt + 1} failed (${msg}), retrying in ${delay}ms...`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break; // non-retryable or final attempt
      }
    }
  }

  const classified = classifyGeminiError(lastError);
  if (log?.error) {
    log.error(
      {
        status: classified.status,
        durationMs: Date.now() - start,
        originalMessage:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
      "gemini: call failed",
    );
  }
  throw new GeminiError(classified, lastError);
}
