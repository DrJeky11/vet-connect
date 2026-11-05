import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_IDS, LOCALITY_IDS } from "./schema";
import { parseSentence, sanitize, type NavigatorFilters } from "./navigator";

export const chatEnabled = () => process.env.ENABLE_CHAT === "true";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "locality", "free_only", "spanish", "wheelchair"],
  properties: {
    category: { anyOf: [{ type: "string", enum: CATEGORY_IDS }, { type: "null" }] },
    locality: { anyOf: [{ type: "string", enum: LOCALITY_IDS }, { type: "null" }] },
    free_only: { type: "boolean" },
    spanish: { type: "boolean" },
    wheelchair: { type: "boolean" },
  },
};

const SYSTEM = `You convert one sentence from a veteran or caregiver into search filters for a local services directory in the Fredericksburg, Virginia region.
Return only the filters. Do not answer the question and do not add facts.
Categories: ${CATEGORY_IDS.join(", ")}. Localities: ${LOCALITY_IDS.join(", ")}.
Use null when the sentence does not clearly name a category or locality. Set free_only only if the person asks for free help or says they cannot afford it.`;

/**
 * Turn a sentence into filters. Uses Claude when ANTHROPIC_API_KEY is set,
 * otherwise (or on any error) falls back to keyword matching. Either way the
 * model only picks filters; results always come from the directory.
 */
export async function extractFilters(text: string): Promise<{ filters: NavigatorFilters; engine: "claude" | "keywords" }> {
  if (!process.env.ANTHROPIC_API_KEY) return { filters: parseSentence(text), engine: "keywords" };
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: text.slice(0, 500) }],
    });
    if (response.stop_reason === "refusal") return { filters: parseSentence(text), engine: "keywords" };
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { filters: parseSentence(text), engine: "keywords" };
    return { filters: sanitize(JSON.parse(block.text)), engine: "claude" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`Navigator API error ${err.status}: ${err.message}`);
    else console.error("Navigator error", err);
    return { filters: parseSentence(text), engine: "keywords" };
  }
}
