import { zodResponseFormat } from "openai/helpers/zod";
import { LengthFinishReasonError } from "openai/core/error";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { z } from "zod";
import { assertLlmConfigured, getLlmClient } from "./client";
import { MAX_OUTPUT_TOKENS } from "./models";

export interface StructuredMessage {
  role: "user" | "assistant";
  /** Plain text, or an OpenAI-style multimodal content array (used for vision input — see agents/idea-validation/autofill.ts). */
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}

export interface StructuredCallParams<T extends z.ZodType> {
  model: string;
  /** Short, per-stage instruction. */
  system: string;
  /** Long, stable content (rubric anchors, glossary, catalogue) — appended to the system message. The gateway/model may cache repeated prefixes automatically; this build doesn't control that explicitly (see README). */
  cacheableSystem?: string;
  messages: StructuredMessage[];
  schema: T;
  maxTokens?: number;
}

/**
 * Runs a single structured assessment/interaction call against the
 * OpenAI-compatible gateway and validates the result against the zod
 * schema again in application code, per the plan's "structured in,
 * structured out" and "validated again before anything is rendered or
 * stored" reliability principles. Retries once with a correction message
 * if the model's output fails validation.
 */
export async function runStructured<T extends z.ZodType>(
  params: StructuredCallParams<T>
): Promise<z.infer<T>> {
  assertLlmConfigured();
  const client = getLlmClient();

  const systemContent = params.cacheableSystem ? `${params.system}\n\n${params.cacheableSystem}` : params.system;

  const attempt = async (extraMessages: StructuredMessage[], maxTokens: number): Promise<z.infer<T>> => {
    const messages = [
      { role: "system" as const, content: systemContent },
      ...params.messages,
      ...extraMessages,
    ] as ChatCompletionMessageParam[];
    const requestId = Math.random().toString(36).slice(2, 8);
    console.log(`[llm:${requestId}] request`, JSON.stringify({ model: params.model, maxTokens, messages }, null, 2));

    const startedAt = Date.now();
    let completion;
    try {
      completion = await client.chat.completions.parse({
        model: params.model,
        max_completion_tokens: maxTokens,
        messages,
        response_format: zodResponseFormat(params.schema, "structured_output"),
      });
    } catch (err) {
      console.log(`[llm:${requestId}] error after ${Date.now() - startedAt}ms`, err instanceof Error ? err.message : err);
      throw err;
    }

    const parsed = completion.choices[0]?.message?.parsed;
    console.log(`[llm:${requestId}] response after ${Date.now() - startedAt}ms`, JSON.stringify(parsed, null, 2));
    if (!parsed) {
      throw new Error("Model did not return a structured output");
    }
    return params.schema.parse(parsed);
  };

  const initialMaxTokens = params.maxTokens ?? MAX_OUTPUT_TOKENS;

  try {
    return await attempt([], initialMaxTokens);
  } catch (err) {
    if (err instanceof LengthFinishReasonError) {
      // The response was cut off mid-JSON by the token budget, not a
      // schema mismatch — retrying with the same prompt just truncates
      // again. Give it more room instead of a correction message, capped
      // at the model's own output ceiling.
      return attempt([], Math.min(initialMaxTokens * 2, MAX_OUTPUT_TOKENS));
    }
    const detail = err instanceof Error ? err.message : String(err);
    return attempt(
      [
        {
          role: "user",
          content: `Your previous response did not match the required schema (${detail}). Return only a corrected structured output.`,
        },
      ],
      initialMaxTokens
    );
  }
}
