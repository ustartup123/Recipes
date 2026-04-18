import { describe, it, expect } from "vitest";
import logger, {
  withRequest,
  serializeError,
  elapsedMs,
  startTimer,
} from "@/lib/logger";

describe("serializeError", () => {
  it("serializes an Error with name / message / stack", () => {
    const err = new Error("boom");
    const out = serializeError(err);
    expect(out.name).toBe("Error");
    expect(out.message).toBe("boom");
    expect(typeof out.stack).toBe("string");
  });

  it("carries over custom status / originalMessage fields", () => {
    const err = new Error("outer") as Error & {
      status: number;
      originalMessage: string;
    };
    err.status = 503;
    err.originalMessage = "upstream 503";
    const out = serializeError(err);
    expect(out.status).toBe(503);
    expect(out.originalMessage).toBe("upstream 503");
  });

  it("handles non-Error values", () => {
    expect(serializeError("string err")).toEqual({ message: "string err" });
    expect(serializeError(42)).toEqual({ message: "42" });
  });
});

describe("withRequest", () => {
  it("returns a child logger with reqId, route, method", () => {
    const req = new Request("https://example.test/api/parse-url", {
      method: "POST",
    });
    const child = withRequest(logger, req, "parse-url");
    const bindings = (child as unknown as { bindings: () => unknown }).bindings();
    expect(bindings).toMatchObject({
      route: "parse-url",
      method: "POST",
    });
    expect(typeof (bindings as { reqId: unknown }).reqId).toBe("string");
  });

  it("prefers an incoming x-request-id header", () => {
    const req = new Request("https://example.test/api/parse-url", {
      method: "POST",
      headers: { "x-request-id": "from-client-123" },
    });
    const child = withRequest(logger, req, "parse-url");
    const bindings = (child as unknown as { bindings: () => unknown }).bindings();
    expect((bindings as { reqId: string }).reqId).toBe("from-client-123");
  });
});

describe("elapsedMs / startTimer", () => {
  it("returns a non-negative integer", async () => {
    const start = startTimer();
    await new Promise((r) => setTimeout(r, 5));
    const dt = elapsedMs(start);
    expect(Number.isInteger(dt)).toBe(true);
    expect(dt).toBeGreaterThanOrEqual(0);
  });
});
