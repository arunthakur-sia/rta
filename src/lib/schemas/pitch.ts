import { z } from "zod";

export const pitchTemplateSectionSchema = z.enum([
  "problem",
  "users",
  "validation",
  "prototype",
  "value",
  "ask",
  "team",
  "other",
]);

export const pitchDimensionNameSchema = z.enum([
  "narrative_clarity",
  "evidence_traction",
  "value_to_rta",
  "plan_and_ask",
  "delivery_timing",
  "visual_clarity",
  "qa_resilience",
]);

// No `.int()` or `.min()/.max()` on numbers anywhere in this file: Bedrock's
// structured outputs backend rejects `minimum`/`maximum` on integer schema
// nodes, and zod's `.int()` adds those bounds automatically (JS's
// safe-integer range) even with no explicit call — so plain `z.number()`
// is used throughout and ranges are prompt-enforced instead. Same as
// lib/schemas/idea.ts.

// -- Upload / parse: image descriptions for slides rendered without a
// vision-capable render step in this build (see lib/parsing/deckParser.ts).
export const slideDescriptionSchema = z.object({
  slides: z.array(
    z.object({
      index: z.number(),
      imageDescription: z
        .string()
        .nullable()
        .describe("Short description of any chart/image on this slide, or null if none was found"),
    })
  ),
});

// -- Structure stage
export const structureOutputSchema = z.object({
  mapping: z.array(z.object({ slide: z.number(), section: pitchTemplateSectionSchema })),
  missing: z.array(pitchTemplateSectionSchema),
  suggestedOrder: z.array(z.number()),
});
export type StructureModelOutput = z.infer<typeof structureOutputSchema>;

// -- Content stage
export const slideCommentSchema = z.object({
  slide: z.number(),
  element: z.enum(["title", "body", "visual", "notes"]),
  quote: z.string().describe("The exact text or element being commented on — required for the anchor"),
  issue: z.string(),
  rewrite: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const contentOutputSchema = z.object({
  comments: z.array(slideCommentSchema),
});
export type ContentModelOutput = z.infer<typeof contentOutputSchema>;

// -- Coherence stage
export const coherenceRowSchema = z.object({
  slide: z.number(),
  claim: z.string(),
  recordRef: z.string().describe("What in the idea record this claim is checked against"),
  status: z.enum(["supported", "overstated", "changed", "unsupported"]),
});

export const coherenceOutputSchema = z.object({
  rows: z.array(coherenceRowSchema),
});
export type CoherenceModelOutput = z.infer<typeof coherenceOutputSchema>;

// -- Readiness stage (dimension ratings; score + verdict computed in app code)
export const pitchDimensionRatingSchema = z.object({
  name: pitchDimensionNameSchema,
  rating: z.number().describe("1-5"),
  anchor: z.string(),
  evidence: z.array(z.string()),
});

export const readinessOutputSchema = z.object({
  // Not `.length(7)` — Bedrock's native structured outputs (which this
  // gateway routes to) only allow array minItems of 0 or 1. Enforced by
  // the prompt instruction ("Rate all seven pitch rubric dimensions")
  // instead.
  dimensions: z.array(pitchDimensionRatingSchema).describe("Exactly seven entries, one per rubric dimension"),
});
export type ReadinessModelOutput = z.infer<typeof readinessOutputSchema>;

// -- Mock jury
export const mockJuryQuestionSchema = z.object({
  personaId: z.string(),
  question: z.string(),
  weakPointRef: z.string().nullable().describe("What earlier flag/comment this question targets, if any"),
});
export type MockJuryQuestionOutput = z.infer<typeof mockJuryQuestionSchema>;

export const mockJuryEvaluationSchema = z.object({
  evaluation: z.string().describe("Short evaluation of the participant's answer"),
  modelAnswer: z.string().describe("A model answer for comparison"),
});
export type MockJuryEvaluationOutput = z.infer<typeof mockJuryEvaluationSchema>;
