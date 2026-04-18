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
import logger from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyAuthToken(req.headers.get("authorization"));
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let html: string;
    try {
      html = await fetchUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${msg}. The site may be blocking automated access.`,
        },
        { status: 400 },
      );
    }
    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: "The URL returned empty or very short content" },
        { status: 400 },
      );
    }

    const extracted = extractRecipeContent(html, url);
    if (extracted.content.length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from the URL" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
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

    const result = await callGeminiWithRetry(
      () => model.generateContent(prompt),
      logger,
    );
    const text = result.response.text();
    const recipe = extractJson(text) as Record<string, unknown>;
    recipe.imageUrl = extracted.imageUrl;
    recipe.sourceUrl = url;

    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof GeminiError) {
      logger.error(
        { originalMessage: err.originalMessage },
        "Gemini error in parse-url",
      );
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.includes("Authorization")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ err }, "parse-url failed");
    const { userMessage } = classifyGeminiError(err);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
