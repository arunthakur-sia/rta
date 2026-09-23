import { runStructured } from "@/lib/llm/structured";
import { FAST_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/llm/models";
import { ideaCanvasAutofillSchema, type IdeaCanvasAutofillOutput } from "@/lib/schemas/idea";

const instruction = `Extract idea-worksheet fields from the document below. This is a workshop worksheet with these sections: idea name/title, table/theme, prioritised challenge, the proposed intervention (how it works, why it should improve adoption), how the experience changes (today, proposed experience), what must change (customer communication, process or service rules, digital capability, operations and ecosystem), key assumptions/risks/dependencies, and a table assessment (expected impact and implementation feasibility, each scored 0-5).

Only fill a field when the document actually contains content for it. Leave a field null if it is blank, illegible, or not present — never invent or infer content that isn't there.`;

export async function autofillIdeaCanvas(input: {
  text?: string;
  imageDataUrl?: string;
  locale: "en" | "ar";
  userId: string;
}): Promise<IdeaCanvasAutofillOutput> {
  const content = input.imageDataUrl
    ? [{ type: "text" as const, text: instruction }, { type: "image_url" as const, image_url: { url: input.imageDataUrl } }]
    : `${instruction}\n\n## Document text\n${input.text}`;

  return runStructured({
    model: FAST_MODEL,
    system: `You extract structured data from a submitted idea-validation worksheet. Reply in ${input.locale === "ar" ? "Arabic" : "English"} for any free-text field you fill, matching the document's own language where possible. Never fabricate content that isn't present in the source.`,
    messages: [{ role: "user", content }],
    schema: ideaCanvasAutofillSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    // No idea record exists yet at this stage (autofill runs before the
    // idea is created) — attributed to the user only.
    usage: { userId: input.userId, stage: "idea.autofill" },
  });
}
