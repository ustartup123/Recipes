/**
 * Gemini prompts for recipe extraction. All outputs are structured JSON
 * in Hebrew.
 */

export function urlPrompt(args: {
  content: string;
  pageTitle: string;
  metaDescription: string;
  url: string;
  hasStructuredData: boolean;
}): string {
  const structuredHint = args.hasStructuredData
    ? "The page has structured recipe data (JSON-LD) which is the most reliable source."
    : "This page has NO structured recipe schema. The recipe is embedded in free-form text. Look carefully for ingredients and instructions within the narrative text.";

  return `You are an expert recipe extractor. Below is raw content scraped from a recipe webpage. The content may be MESSY and contain irrelevant text (ads, navigation, comments, related articles, etc.).

Your job: IGNORE all the noise and extract ONLY the recipe information.
${structuredHint}

Page title: "${args.pageTitle}"
Page description: "${args.metaDescription}"
URL: ${args.url}

Return ONLY valid JSON with this exact structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Critical rules:
- Translate EVERYTHING to Hebrew (title, ingredients, instructions, tags)
- Each instruction step MUST include the specific amounts of ingredients mentioned in that step (e.g., "לערבב 500 גרם קמח עם ליטר מים" not just "לערבב קמח עם מים")
- Tags should be relevant Hebrew food categories (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים", "ארוחת ערב", "מרקים")
- Focus ONLY on the actual recipe - ignore comments, ads, "related recipes", author bio, etc.
- If there are multiple recipes on the page, extract only the main/primary recipe
- Keep ingredient amounts in their original measurement units, just translate the unit name to Hebrew
- If the recipe content is in a blog narrative style, carefully extract the ingredients and steps from the text

=== RAW PAGE CONTENT (extract the recipe from this mess) ===
${args.content}`;
}

export function textPrompt(text: string): string {
  return `Parse the following free text into a structured recipe. Return ONLY valid JSON with this structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Important:
- If the text is not in Hebrew, translate everything to Hebrew
- Each instruction step MUST include the specific amounts of ingredients mentioned in that step (e.g., "לערבב את 500 גרם הקמח עם הליטר מים")
- Tags should be in Hebrew (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים")
- Parse any format - the text might be messy, just extract the recipe information

Text:
${text}`;
}

/** Safely extract the first JSON object from a Gemini response. */
export function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return JSON");
  return JSON.parse(match[0]);
}
