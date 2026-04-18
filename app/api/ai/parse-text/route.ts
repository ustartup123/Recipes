import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyAuthToken } from "@/lib/firebase-admin";
import {
  callGeminiWithRetry,
  GeminiError,
  classifyGeminiError,
} from "@/lib/gemini";
import { textPrompt, extractJson } from "@/lib/ai/prompts";
import logger from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyAuthToken(req.headers.get("authorization"));
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `[app:recipes-app][user:${decoded.uid}]\n\n${textPrompt(text)}`;
    const result = await callGeminiWithRetry(
      () => model.generateContent(prompt),
      logger,
    );
    const responseText = result.response.text();
    const recipe = extractJson(responseText);
    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof GeminiError) {
      logger.error(
        { originalMessage: err.originalMessage },
        "Gemini error in parse-text",
      );
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.includes("Authorization")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ err }, "parse-text failed");
    const { userMessage } = classifyGeminiError(err);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
