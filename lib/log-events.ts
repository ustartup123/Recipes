import type { Logger } from "pino";

export const EventType = {
  API_REQUEST: "API_REQUEST",
  API_RESPONSE: "API_RESPONSE",
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILURE: "AUTH_FAILURE",
  GEMINI_CALL: "GEMINI_CALL",
  GEMINI_ERROR: "GEMINI_ERROR",
  GEMINI_RETRY: "GEMINI_RETRY",
  RECIPE_IMPORT: "RECIPE_IMPORT",
  RECIPE_PARSE: "RECIPE_PARSE",
  YOUTUBE_EXTRACT: "YOUTUBE_EXTRACT",
  UNHANDLED_ERROR: "UNHANDLED_ERROR",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export function logEvent(
  log: Logger,
  eventType: EventType,
  data?: Record<string, unknown>,
): void {
  log.info({ event: eventType, ...data });
}
