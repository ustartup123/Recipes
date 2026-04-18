import { describe, it, expect } from "vitest";
import { extractJson, urlPrompt, textPrompt } from "@/lib/ai/prompts";

describe("extractJson", () => {
  it("extracts a bare JSON object", () => {
    const got = extractJson('{"title":"cake","tags":["dessert"]}');
    expect(got).toEqual({ title: "cake", tags: ["dessert"] });
  });

  it("extracts JSON from a response wrapped in prose", () => {
    const wrapped =
      'Sure, here is the recipe:\n```json\n{"title":"pizza"}\n```\nhope that helps';
    expect(extractJson(wrapped)).toEqual({ title: "pizza" });
  });

  it("extracts JSON with nested objects and arrays", () => {
    const src =
      'out: {"title":"x","ingredients":[{"name":"salt","amount":"1 tsp"}]}';
    expect(extractJson(src)).toEqual({
      title: "x",
      ingredients: [{ name: "salt", amount: "1 tsp" }],
    });
  });

  it("throws when no JSON object present", () => {
    expect(() => extractJson("no json here")).toThrow(/did not return JSON/);
  });

  it("throws when JSON is malformed", () => {
    expect(() => extractJson("{not valid}")).toThrow();
  });
});

describe("urlPrompt", () => {
  const base = {
    content: "raw html content",
    pageTitle: "Best Pizza",
    metaDescription: "the best pizza recipe",
    url: "https://example.com/pizza",
    hasStructuredData: true,
  };

  it("includes page context and url", () => {
    const p = urlPrompt(base);
    expect(p).toContain("Best Pizza");
    expect(p).toContain("the best pizza recipe");
    expect(p).toContain("https://example.com/pizza");
    expect(p).toContain("raw html content");
  });

  it("switches hint based on hasStructuredData flag", () => {
    expect(urlPrompt({ ...base, hasStructuredData: true })).toContain(
      "JSON-LD",
    );
    expect(urlPrompt({ ...base, hasStructuredData: false })).toContain(
      "NO structured recipe schema",
    );
  });

  it("instructs Hebrew output", () => {
    expect(urlPrompt(base)).toContain("Hebrew");
  });
});

describe("textPrompt", () => {
  it("embeds the user text and requires JSON", () => {
    const p = textPrompt("some recipe text");
    expect(p).toContain("some recipe text");
    expect(p).toContain("JSON");
    expect(p).toContain("Hebrew");
  });
});
