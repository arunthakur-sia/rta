import { z } from "zod";

// Mirrors Appendix A "Idea validation assessment". Note verdict and
// weighted_score are intentionally NOT part of the model's output schema —
// they are computed deterministically in lib/scoring/ideaVerdict.ts.

export const ideaDimensionNameSchema = z.enum([
  "problem_clarity",
  "user_evidence",
  "value_viability",
  "feasibility",
  "novelty_risk",
]);

export const evidenceRefSchema = z.object({
  source: z
    .string()
    .describe(
      "The exact citation key from the record above — canvas.<fieldKey> (e.g. canvas.howItWorks), clarification.<id>, or evidence.<id>, copied verbatim from the [brackets] shown next to that field/clarification/evidence item, never invented or guessed. Use \"web\" only for a cited external source."
    ),
  quote: z.string(),
  // OpenAI-compatible structured outputs require every object property to
  // be present in the schema's `required` list — z.optional() alone omits
  // it from `required` and gets rejected. Use nullable (always present,
  // may be null) instead of optional (may be absent) for anything the
  // model can legitimately not have a value for.
  url: z.string().nullable(),
});

export const dimensionRatingSchema = z.object({
  name: ideaDimensionNameSchema,
  // Not `.int().min(1).max(5)`: Bedrock's native structured outputs (which
  // this gateway routes to) reject `minimum`/`maximum` on integer schema
  // nodes outright, and zod's `.int()` adds those bounds automatically
  // even with no explicit `.min()/.max()` call (it encodes JS's safe-
  // integer range). Plain `z.number()` avoids both. The range is
  // prompt-enforced; lib/scoring/ideaVerdict.ts clamps to 1-5 defensively
  // before scoring, since this schema can no longer guarantee it.
  rating: z.number().nullable().describe("1-5, or null if there is insufficient information to rate this dimension"),
  anchor: z.string().describe("The written rubric anchor text that justifies this rating"),
  evidence: z.array(evidenceRefSchema),
  openQuestions: z.array(z.string()),
});

export const ideaAssessmentModelOutputSchema = z.object({
  language: z.enum(["en", "ar"]),
  // Not `.length(5)`: this gateway's structured-output backend (Bedrock's
  // native structured outputs) only allows array minItems of 0 or 1, so an
  // exact-length constraint is rejected outright. Exactness is enforced by
  // the prompt instruction ("rate the idea on all five rubric dimensions")
  // instead — the critique pass is the remaining backstop.
  dimensions: z.array(dimensionRatingSchema).describe("Exactly five entries, one per rubric dimension"),
  assumptionsToVerify: z.array(z.string()),
  // minItems=1 is allowed (Bedrock only rejects values other than 0/1);
  // maxItems is rejected outright at any value, so no `.max()` here.
  topReasons: z.array(z.string()).min(1).describe("At most three reasons"),
  confidence: z.enum(["high", "medium", "low"]),
});
export type IdeaAssessmentModelOutput = z.infer<typeof ideaAssessmentModelOutputSchema>;

// Output of the clarify stage: one adaptive question at a time.
export const clarifyQuestionSchema = z.object({
  coverageComplete: z
    .boolean()
    .describe("true if all five dimensions now have enough information and no more questions are needed"),
  question: z.string().nullable().describe("The next question to ask, or null if coverageComplete is true"),
  whyWeAsk: z.string().nullable().describe("One short line explaining why this question matters"),
  targetDimension: ideaDimensionNameSchema.nullable(),
});
export type ClarifyQuestionOutput = z.infer<typeof clarifyQuestionSchema>;

// Critique pass: reviews the assessment for unsupported claims, missing
// anchors, contradictions and rubric drift before it is shown to the
// participant. Returns a (possibly corrected) assessment.
export const critiqueOutputSchema = z.object({
  correctedAssessment: ideaAssessmentModelOutputSchema,
  changesMade: z.array(z.string()).describe("What the critique pass changed and why, for the audit trail"),
});
export type CritiqueOutput = z.infer<typeof critiqueOutputSchema>;

// No numeric bounds anywhere below (Bedrock's structured outputs reject
// `minimum`/`maximum` on integers) — ranges are prompt-enforced instead.
export const prototypeOptionSchema = z.object({
  rung: z.number().describe("1-5, the fidelity ladder rung"),
  type: z.string(),
  tools: z.array(z.string()),
  buildItems: z.array(z.string()),
  effortTeamDays: z.object({ min: z.number(), max: z.number() }),
  test: z.object({
    protocol: z.string(),
    users: z.number(),
    metric: z.string(),
    successThreshold: z.string(),
    ifMissed: z.string(),
  }),
});

export const prototypePlanModelOutputSchema = z.object({
  riskiestAssumption: z.string(),
  primary: prototypeOptionSchema,
  alternative: prototypeOptionSchema,
  whyNotHigherFidelity: z.string(),
});
export type PrototypePlanModelOutput = z.infer<typeof prototypePlanModelOutputSchema>;

export const pivotReframingsSchema = z.object({
  // Not `.length(2)` — see the comment on `dimensions` above; same backend
  // constraint. Enforced by prompt instruction instead.
  reframings: z.array(z.string()).describe("Exactly two adjacent problem framings"),
});

export const whatMustChangeAutofillSchema = z.object({
  customerCommunication: z.string().nullable(),
  processOrServiceRules: z.string().nullable(),
  digitalCapability: z.string().nullable(),
  operationsAndEcosystem: z.string().nullable(),
});

// Output of the canvas-autofill pass: extracts whatever the source
// document (docx/pdf text, or an image sent as a vision input) actually
// contains. Every field nullable, not optional — same Bedrock
// structured-output constraint as the schemas above — so the model must
// explicitly say "not present" rather than omit a field.
export const ideaCanvasAutofillSchema = z.object({
  ideaTitle: z.string().nullable().describe("The idea's name/title, if present in the document"),
  tableTheme: z.string().nullable(),
  prioritisedChallenge: z.string().nullable(),
  howItWorks: z.string().nullable(),
  whyItImprovesAdoption: z.string().nullable(),
  currentExperience: z.string().nullable(),
  proposedExperience: z.string().nullable(),
  whatMustChange: whatMustChangeAutofillSchema,
  assumptionsRisksDependencies: z.string().nullable(),
  expectedImpact: z.number().nullable().describe("0-5, if a score is given in the document"),
  implementationFeasibility: z.number().nullable().describe("0-5, if a score is given in the document"),
});
export type IdeaCanvasAutofillOutput = z.infer<typeof ideaCanvasAutofillSchema>;

// Phase 4 follow-up mode: a lighter weekly check-in, outside the main graph.
export const followUpCheckInSchema = z.object({
  progressAssessment: z.string().describe("Short read on how the test is going against the plan"),
  riskiestAssumptionChanged: z.boolean(),
  updatedRiskiestAssumption: z.string().nullable(),
  recommendation: z.string().describe("What the team should do next"),
});
export type FollowUpCheckInOutput = z.infer<typeof followUpCheckInSchema>;

