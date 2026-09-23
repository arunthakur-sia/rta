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
 * A dimension rated `null` ("insufficient information") is scored as a 2
 * for the numeric average — conservative, but never allowed to produce a
 * Ready verdict (see the `insufficient_information_blocks_ready` rule
 * below), since "not enough evidence" should never wave a team straight
 * into prototyping.
 */
export function computeIdeaVerdict(rawDimensions: DimensionRating[]): IdeaVerdictResult {
  const dimensions = rawDimensions.map((d) => ({ ...d, rating: clampRating(d.rating) }));
  const byName = new Map(dimensions.map((d) => [d.name, d]));

  const weightedScoreRaw = ideaValidationRubric.reduce((sum, dim) => {
    const rating = byName.get(dim.name)?.rating ?? 2;
    return sum + dim.weight * rating;
  }, 0);
  const weightedScore = Math.round(weightedScoreRaw * 100) / 100;

  const userEvidence = byName.get("user_evidence");
  const hasRating1 = dimensions.some((d) => d.rating === 1);
  const hasNullRating = dimensions.some((d) => d.rating === null);

  if (hasRating1) {
    return {
      weightedScore,
      verdict: "refine_and_resubmit",
      hardRuleTriggered: "a_dimension_rated_1_forces_refine",
    };
  }

  if (weightedScore >= 3.6) {
    if ((userEvidence?.rating ?? 0) < 3) {
      return {
        weightedScore,
        verdict: "refine_and_resubmit",
        hardRuleTriggered: "user_evidence_below_3_blocks_ready",
      };
    }
    if (hasNullRating) {
      return {
        weightedScore,
        verdict: "refine_and_resubmit",
        hardRuleTriggered: "insufficient_information_blocks_ready",
      };
    }
    return { weightedScore, verdict: "ready_to_prototype", hardRuleTriggered: null };
  }

  if (weightedScore >= 2.6) {
    return { weightedScore, verdict: "refine_and_resubmit", hardRuleTriggered: null };
  }

  return { weightedScore, verdict: "pivot", hardRuleTriggered: null };
}
