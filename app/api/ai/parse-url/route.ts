import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyAuthToken } from "@/lib/firebase-admin";
import {
  callGeminiWithRetry,
  GeminiError,
  classifyGeminiError,
} from "@/lib/gemini";
import { fetchUrl, extractRecipeContent } from "@/lib/ai/fetch-and-extract";
import { urlPrompt, extractJson } from "@/lib/ai/prompts";
import logger, {
  elapsedMs,
  serializeError,
  startTimer,
  withRequest,
} from "@/lib/logger";
import { EventType, logEvent } from "@/lib/log-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

export async function POST(req: NextRequest) {
  const log = withRequest(logger, req, "parse-url");
  const start = startTimer();
  logEvent(log, EventType.API_REQUEST, { method: req.method, route: "parse-url" });

  try {
    const decoded = await verifyAuthToken(req.headers.get("authorization"));
    const userLog = log.child({ userId: decoded.uid });
    logEvent(userLog, EventType.AUTH_SUCCESS, { userId: decoded.uid });

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      userLog.warn("validation: url missing or not a string");
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    const host = hostOf(url);
    userLog.info({ host }, "validation: url accepted");

    let html: string;
    try {
      html = await fetchUrl(url, userLog);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      userLog.warn(
        { host, durationMs: elapsedMs(start), err: serializeError(err) },
        "request: aborted — fetchUrl failed",
      );
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${msg}. The site may be blocking automated access.`,
        },
        { status: 400 },
      );
    }
    if (!html || html.length < 100) {
      userLog.warn(
        { host, bytes: html?.length ?? 0 },
        "request: aborted — URL returned empty/short content",
      );
      return NextResponse.json(
        { error: "The URL returned empty or very short content" },
        { status: 400 },
      );
    }

    const extracted = extractRecipeContent(html, url, userLog);
    if (extracted.content.length < 50) {
      userLog.warn(
        { host, contentLength: extracted.content.length },
        "request: aborted — extracted content too short",
      );
      return NextResponse.json(
        { error: "Could not extract meaningful content from the URL" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      userLog.error("config: GEMINI_API_KEY is not set");
      throw new Error("GEMINI_API_KEY is not set");
    }
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `[app:recipes-app][user:${decoded.uid}]\n\n${urlPrompt({
      content: extracted.content,
      pageTitle: extracted.pageTitle,
      metaDescription: extracted.metaDescription,
      url,
      hasStructuredData: extracted.hasStructuredData,
    })}`;
    logEvent(userLog, EventType.GEMINI_CALL, {
      promptChars: prompt.length,
      hasStructuredData: extracted.hasStructuredData,
      host,
    });

    const result = await callGeminiWithRetry(
      () => model.generateContent(prompt),
      userLog,
    );
    const text = result.response.text();
    userLog.info({ responseChars: text.length }, "gemini: response received");

    const recipe = extractJson(text) as Record<string, unknown>;
    recipe.imageUrl = extracted.imageUrl;
    recipe.sourceUrl = url;

    logEvent(userLog, EventType.RECIPE_IMPORT, {
      host,
      durationMs: elapsedMs(start),
      hasImage: !!extracted.imageUrl,
    });
    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof GeminiError) {
      log.error(
        {
          event: EventType.GEMINI_ERROR,
          status: err.status,
          originalMessage: err.originalMessage,
          durationMs: elapsedMs(start),
        },
        "request: failed — Gemini error",
      );
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.includes("Authorization")) {
      log.warn(
        { event: EventType.AUTH_FAILURE, durationMs: elapsedMs(start) },
        "request: rejected — unauthorized",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log.error(
      { event: EventType.UNHANDLED_ERROR, durationMs: elapsedMs(start), err: serializeError(err) },
      "request: failed — unhandled",
    );
    const { userMessage } = classifyGeminiError(err);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
