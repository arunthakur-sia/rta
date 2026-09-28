import { pitchRubric } from "@/lib/skills/pitchRubric";
import type { CoherenceRow, PitchDimensionRating, PitchVerdict } from "@/lib/types/domain";

export interface PitchReadinessResult {
  readinessScore: number;
  verdict: PitchVerdict;
  hardRuleTriggered: string | null;
}

/**
 * "overstated" and "unsupported" claims are treated as high-priority
 * coherence flags (the pitch says something the record does not back up).
 * "changed" is a medium-priority flag — a number moved and needs an
 * explanation, but isn't necessarily dishonest — so it does not by itself
 * force Rework.
 */
function hasHighPriorityCoherenceFlag(rows: CoherenceRow[]): boolean {
  return rows.some((r) => r.status === "overstated" || r.status === "unsupported");
}

/**
 * The model's rating schema can no longer declare `minimum`/`maximum`
 * (Bedrock's structured outputs backend rejects those on integer schema
 * nodes — see lib/schemas/pitch.ts), so a rating outside 1-5 is only
 * prompt-discouraged, not schema-enforced. Clamp defensively before it
 * ever reaches the hard rules or the weighted average.
 */
function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return 1;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

export function computePitchReadiness(
  rawDimensions: PitchDimensionRating[],
  coherenceRows: CoherenceRow[]
): PitchReadinessResult {
  const dimensions = rawDimensions.map((d) => ({ ...d, rating: clampRating(d.rating) }));
  const byName = new Map(dimensions.map((d) => [d.name, d]));

  const readinessScoreRaw = pitchRubric.reduce((sum, dim) => {
    const rating = byName.get(dim.name)?.rating ?? 3;
    return sum + dim.weight * rating;
  }, 0);
  const readinessScore = Math.round(readinessScoreRaw * 100) / 100;

  const delivery = byName.get("delivery_timing")?.rating ?? 3;

  if (hasHighPriorityCoherenceFlag(coherenceRows)) {
    return {
      readinessScore,
      verdict: "rework",
      hardRuleTriggered: "unresolved_high_priority_coherence_flag_forces_rework",
    };
  }

  if (readinessScore >= 3.0) {
    if (delivery < 2) {
      return { readinessScore, verdict: "rehearse", hardRuleTriggered: "delivery_below_2_forces_rehearse" };
    }
    return { readinessScore, verdict: "ready_for_demo_day", hardRuleTriggered: null };
  }

  if (readinessScore >= 2.0) {
    return {
      readinessScore,
      verdict: "rehearse",
      hardRuleTriggered: delivery < 2 ? "delivery_below_2_forces_rehearse" : null,
    };
  }

  return { readinessScore, verdict: "rework", hardRuleTriggered: null };
}
