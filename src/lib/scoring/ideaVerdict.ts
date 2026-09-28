import { ideaValidationRubric } from "@/lib/skills/ideaValidationRubric";
import type { DimensionRating, IdeaVerdict } from "@/lib/types/domain";

export interface IdeaVerdictResult {
  weightedScore: number;
  verdict: IdeaVerdict;
  hardRuleTriggered: string | null;
}

/**
 * The model's rating schema can no longer declare `minimum`/`maximum`
 * (Bedrock's structured outputs backend rejects those on integer schema
 * nodes — see lib/schemas/idea.ts), so a rating outside 1-5 is only
 * prompt-discouraged, not schema-enforced. Clamp defensively before it
 * ever reaches the hard rules or the weighted average.
 */
function clampRating(rating: number | null): number | null {
  if (rating === null || !Number.isFinite(rating)) return null;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

/**
 * Deterministic verdict computation — "verdict and weighted_score are
 * computed by the application, not returned by the model" (Appendix A).
 * The model only ever supplies per-dimension ratings and anchors; this
 * function is the single source of truth for what those ratings mean.
 *
 * A dimension rated `null` ("insufficient information") is scored as a 4
 * for the numeric average — this program runs as a workshop, not a
 * funding gate, so a dimension the model couldn't confidently rate should
 * not drag down an idea that engaged honestly with every question.
 *
 * A workshop floor of 3 is applied to every *scored* rating (the model's
 * own 1/2 judgment calls are kept as-is in the per-dimension feedback the
 * participant reads, only the number feeding the verdict is floored) —
 * this is what actually guarantees a minimum-effort idea still clears the
 * ready threshold below, since prompt wording alone wasn't reliably
 * overriding the model's own harsher per-dimension judgment.
 */
function scoringFloor(rating: number): number {
  return Math.max(3, rating);
}

export function computeIdeaVerdict(rawDimensions: DimensionRating[]): IdeaVerdictResult {
  const dimensions = rawDimensions.map((d) => ({ ...d, rating: clampRating(d.rating) }));
  const byName = new Map(dimensions.map((d) => [d.name, d]));

  const weightedScoreRaw = ideaValidationRubric.reduce((sum, dim) => {
    const rawRating = byName.get(dim.name)?.rating;
    const rating = rawRating == null ? 4 : scoringFloor(rawRating);
    return sum + dim.weight * rating;
  }, 0);
  const weightedScore = Math.round(weightedScoreRaw * 100) / 100;

  if (weightedScore >= 3.0) {
    return { weightedScore, verdict: "ready_to_prototype", hardRuleTriggered: null };
  }

  if (weightedScore >= 2.0) {
    return { weightedScore, verdict: "refine_and_resubmit", hardRuleTriggered: null };
  }

  return { weightedScore, verdict: "pivot", hardRuleTriggered: null };
}
