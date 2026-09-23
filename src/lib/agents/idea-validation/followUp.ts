import { runStructured } from "@/lib/llm/structured";
import { FAST_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/llm/models";
import { followUpCheckInSchema, type FollowUpCheckInOutput } from "@/lib/schemas/idea";
import { getIdeaAssessment, getLatestPrototypePlan } from "@/lib/db/queries/ideas";
import { ideaRecordContext, roleAndBoundaries } from "./prompts";
import type { Idea } from "@/lib/types/domain";

/**
 * Phase 4 "follow-up mode": a lighter weekly check-in, not part of the main
 * intake→...→closed graph. Checks progress against the test plan, helps
 * interpret results against the threshold, and flags if the riskiest
 * assumption changed.
 */
export async function runFollowUpCheckIn(idea: Idea, updateText: string): Promise<FollowUpCheckInOutput> {
  const plan = await getLatestPrototypePlan(idea.id);
  const assessment = idea.currentAssessmentVersion > 0 ? await getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : null;

  return runStructured({
    model: FAST_MODEL,
    system: `${roleAndBoundaries(idea.language)}

Current stage: FOLLOW-UP (phase 4, weekly check-in). The team already has a prototype test plan. Read their update, assess progress against the plan's success threshold, and say whether the riskiest assumption has changed.`,
    messages: [
      {
        role: "user",
        content: `${ideaRecordContext(idea)}\n\nPrototype plan: ${plan ? JSON.stringify(plan) : "(none yet)"}\nLast verdict: ${assessment?.verdict ?? "(none)"}\n\nTeam's update this week:\n${updateText}`,
      },
    ],
    schema: followUpCheckInSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.follow_up" },
  });
}
