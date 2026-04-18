import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyAuthToken } from "@/lib/firebase-admin";
import {
  callGeminiWithRetry,
  GeminiError,
  classifyGeminiError,
} from "@/lib/gemini";
import { textPrompt, extractJson } from "@/lib/ai/prompts";
import logger, {
  elapsedMs,
  serializeError,
  startTimer,
  withRequest,
} from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const log = withRequest(logger, req, "parse-text");
  const start = startTimer();
  log.info("request: start");

  try {
    const decoded = await verifyAuthToken(req.headers.get("authorization"));
    const userLog = log.child({ userId: decoded.uid });
    userLog.info("auth: ok");

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      userLog.warn("validation: text missing or not a string");
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    userLog.info({ textChars: text.length }, "validation: text accepted");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      userLog.error("config: GEMINI_API_KEY is not set");
      throw new Error("GEMINI_API_KEY is not set");
    }
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `[app:recipes-app][user:${decoded.uid}]\n\n${textPrompt(text)}`;
    userLog.info({ promptChars: prompt.length }, "gemini: prompt built");

    const result = await callGeminiWithRetry(
      () => model.generateContent(prompt),
      userLog,
    );
    const responseText = result.response.text();
    userLog.info(
      { responseChars: responseText.length },
      "gemini: response received",
    );

    const recipe = extractJson(responseText);
    userLog.info(
      { durationMs: elapsedMs(start) },
      "request: done",
    );
    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof GeminiError) {
      log.error(
        {
          status: err.status,
          originalMessage: err.originalMessage,
          durationMs: elapsedMs(start),
        },
        "request: failed — Gemini error",
      );
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.includes("Authorization")) {
      log.info(
        { durationMs: elapsedMs(start) },
        "request: rejected — unauthorized",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log.error(
      { durationMs: elapsedMs(start), err: serializeError(err) },
      "request: failed — unhandled",
    );
    const { userMessage } = classifyGeminiError(err);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
