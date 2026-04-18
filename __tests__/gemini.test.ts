import { describe, it, expect, vi } from "vitest";
import { callGeminiWithRetry, classifyGeminiError, GeminiError } from "@/lib/gemini";

describe("classifyGeminiError", () => {
  it("classifies 503 / overloaded errors", () => {
    const result = classifyGeminiError(new Error("503 Service Unavailable"));
    expect(result.status).toBe(503);
    expect(result.userMessage).toContain("overloaded");
  });

  it("classifies 429 / rate limit errors", () => {
    const result = classifyGeminiError(new Error("429 RESOURCE_EXHAUSTED"));
    expect(result.status).toBe(429);
    expect(result.userMessage).toContain("Rate limit");
  });

  it("classifies 400 / invalid argument errors", () => {
    const result = classifyGeminiError(new Error("400 INVALID_ARGUMENT"));
    expect(result.status).toBe(400);
    expect(result.userMessage).toContain("Problem processing");
  });

  it("classifies auth errors", () => {
    const result = classifyGeminiError(new Error("API key not valid"));
    expect(result.status).toBe(500);
    expect(result.userMessage).toContain("configuration");
  });

  it("returns generic 500 for unknown errors", () => {
    const result = classifyGeminiError(new Error("Something unexpected"));
    expect(result.status).toBe(500);
    expect(result.userMessage).toContain("Processing error");
  });

  it("handles non-Error values", () => {
    const result = classifyGeminiError("string error 503");
    expect(result.status).toBe(503);
  });
});

describe("GeminiError", () => {
  it("carries status, message, and originalMessage", () => {
    const original = new Error("503 Service Unavailable");
    const err = new GeminiError(
      { status: 503, userMessage: "AI overloaded" },
      original,
    );
    expect(err.message).toBe("AI overloaded");
    expect(err.status).toBe(503);
    expect(err.originalMessage).toBe("503 Service Unavailable");
    expect(err.name).toBe("GeminiError");
  });
});

describe("callGeminiWithRetry", () => {
  it("returns result on first success", async () => {
    const mockResult = { response: { text: () => "hello" } };
    const fn = vi.fn().mockResolvedValue(mockResult);

    const result = await callGeminiWithRetry(fn);
    expect(result).toBe(mockResult);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable errors then succeeds", async () => {
    const mockResult = { response: { text: () => "ok" } };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 Service Unavailable"))
      .mockResolvedValueOnce(mockResult);

    const result = await callGeminiWithRetry(fn);
    expect(result).toBe(mockResult);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("400 INVALID_ARGUMENT"));

    await expect(callGeminiWithRetry(fn)).rejects.toThrow(GeminiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws GeminiError after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 overloaded"));

    try {
      await callGeminiWithRetry(fn);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GeminiError);
      expect((err as GeminiError).status).toBe(503);
      expect((err as GeminiError).originalMessage).toBe("503 overloaded");
    }
    // 1 initial + 3 retries = 4
    expect(fn).toHaveBeenCalledTimes(4);
  }, 15000);

  it("logs retry warnings when logger is provided", async () => {
    const mockResult = { response: { text: () => "ok" } };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED"))
      .mockResolvedValueOnce(mockResult);

    const log = { warn: vi.fn() };
    await callGeminiWithRetry(fn, log);

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Attempt 1 failed"),
    );
  });
});
