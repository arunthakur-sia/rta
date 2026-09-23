import { interrupt } from "@langchain/langgraph";
import { runStructured } from "@/lib/llm/structured";
import { CAPABLE_MODEL, FAST_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/llm/models";
import {
  clarifyQuestionSchema,
  critiqueOutputSchema,
  ideaAssessmentModelOutputSchema,
  pivotReframingsSchema,
  prototypePlanModelOutputSchema,
} from "@/lib/schemas/idea";
import { MAX_CLARIFYING_QUESTIONS } from "@/lib/skills/clarifyingQuestions";
import { computeIdeaVerdict } from "@/lib/scoring/ideaVerdict";
import {
  addClarificationQuestion,
  answerClarification,
  getIdeaAssessment,
  getIdeaById,
  nextAssessmentVersion,
  saveIdeaAssessment,
  savePrototypePlan,
  setIdeaStage,
} from "@/lib/db/queries/ideas";
import { logAction } from "@/lib/db/queries/auditLog";
import { ideaRecordContext, ideaSkillsBlock, roleAndBoundaries } from "./prompts";
import type { IdeaValidationStateType } from "./state";
import type { IdeaAssessment, PrototypeOption, PrototypePlan } from "@/lib/types/domain";

export interface ClarifyInterruptPayload {
  type: "clarify_question";
  clarificationId: string;
  question: string;
  whyWeAsk: string;
  dimension: string | null;
  askedCount: number;
  maxQuestions: number;
}

export async function intakeNode(state: IdeaValidationStateType) {
  await setIdeaStage(state.ideaId, "intake");
  return {};
}

/**
 * Asks exactly one clarifying question per invocation — routeAfterClarify
 * below loops this node back to itself at the *graph* level until done,
 * rather than looping with a `while` inside one node call. This matters
 * because LangGraph replays a node's whole function body from the top on
 * every resume of a paused task (only the `interrupt()` calls themselves
 * are memoized, by call order) — a `while` loop with the model call and DB
 * insert *inside* it, before `interrupt()`, would re-run those side
 * effects on every resume, producing duplicate questions and duplicate
 * rows. Scoping one question to one task, plus the "reuse an already
 * pending unanswered question" check below (which protects a single task
 * against being replayed), makes the whole thing replay-safe.
 */
export async function clarifyNode(state: IdeaValidationStateType) {
  const idea = (await getIdeaById(state.ideaId))!;
  await setIdeaStage(idea.id, "clarify");

  if (idea.clarifications.length >= MAX_CLARIFYING_QUESTIONS) {
    return { clarifyComplete: true };
  }

  let pending = idea.clarifications.find((c) => !c.answer);
  if (!pending) {
    const result = await runStructured({
      model: FAST_MODEL,
      system: `${roleAndBoundaries(state.locale)}

Current stage: CLARIFY. Ask the single next most useful clarifying question, targeting whichever rubric dimension is least covered by the canvas, evidence and prior answers. Signal coverageComplete=true (with question and whyWeAsk set to null) once all five dimensions have enough information, or if you genuinely have nothing more useful to ask. Never repeat a question already asked. Ask only one question.`,
      cacheableSystem: ideaSkillsBlock(),
      messages: [{ role: "user", content: ideaRecordContext(idea) }],
      schema: clarifyQuestionSchema,
      maxTokens: MAX_OUTPUT_TOKENS,
      usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.clarify" },
    });

    if (result.coverageComplete || !result.question) {
      return { clarifyComplete: true };
    }

    pending = await addClarificationQuestion(idea.id, result.question, result.whyWeAsk ?? "", result.targetDimension);
  }

  const answeredCount = idea.clarifications.filter((c) => c.answer).length;
  const answer = interrupt<ClarifyInterruptPayload, string>({
    type: "clarify_question",
    clarificationId: pending.id,
    question: pending.question,
    whyWeAsk: pending.whyWeAsk,
    dimension: pending.dimension,
    askedCount: answeredCount + 1,
    maxQuestions: MAX_CLARIFYING_QUESTIONS,
  });

  await answerClarification(pending.id, answer);
  return { clarifyComplete: false };
}

export function routeAfterClarify(state: IdeaValidationStateType): "clarify" | "assess" {
  return state.clarifyComplete ? "assess" : "clarify";
}

export async function assessNode(state: IdeaValidationStateType) {
  const idea = (await getIdeaById(state.ideaId))!;
  await setIdeaStage(idea.id, "assess");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}

Current stage: ASSESS. Rate the idea on all five rubric dimensions. For each: give a 1-5 rating (or null only if truly insufficient information), quote the exact rubric anchor you are applying, list specific evidence found in the record (with a source reference such as canvas.howItWorks or clarification.<n>), and list open questions. Then list assumptions to verify, the three most important reasons behind your overall read, and your confidence level. This is a single, careful pass — a second reviewer will check your work next, so be rigorous and evidence-driven rather than generous.`,
    cacheableSystem: ideaSkillsBlock(),
    messages: [{ role: "user", content: ideaRecordContext(idea) }],
    schema: ideaAssessmentModelOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.assess" },
  });

  return { draftAssessment: result };
}

export async function critiqueNode(state: IdeaValidationStateType) {
  const idea = (await getIdeaById(state.ideaId))!;
  if (!state.draftAssessment) throw new Error("critiqueNode called without a draft assessment");
  await setIdeaStage(idea.id, "critique");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `You are the quality-control reviewer for the RTA Idea Validation Agent's own output. The participant never sees this pass. Check the draft assessment for: ratings given without a real quoted piece of evidence, evidence that does not actually appear in the record below, an evidence.source citation that isn't one of the exact [bracketed] canvas keys/clarification ids/evidence ids shown in the record, contradictory ratings, and anchors that don't match the rating given. Where a rating lacks real evidence, set it to null and add an open question asking for that evidence rather than leaving an unsupported rating. Where a citation's source doesn't match a real bracketed key/id, correct it to the right one if the quoted text clearly comes from a specific record item, or drop that evidence entry otherwise. Return the full corrected assessment (unchanged fields included) and a short list of what you changed, if anything.`,
    cacheableSystem: ideaSkillsBlock(),
    messages: [
      { role: "user", content: ideaRecordContext(idea) },
      { role: "assistant", content: JSON.stringify(state.draftAssessment) },
      { role: "user", content: "Critique the assessment above against the record and return the corrected version." },
    ],
    schema: critiqueOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.critique" },
  });

  return { draftAssessment: result.correctedAssessment, criticalNotes: result.changesMade };
}

export async function verdictNode(state: IdeaValidationStateType) {
  const idea = (await getIdeaById(state.ideaId))!;
  if (!state.draftAssessment) throw new Error("verdictNode called without a draft assessment");
  await setIdeaStage(idea.id, "verdict");

  const version = await nextAssessmentVersion(idea.id);
  const { weightedScore, verdict, hardRuleTriggered } = computeIdeaVerdict(state.draftAssessment.dimensions);

  let pivotReframings: string[] | null = null;
  if (verdict === "pivot") {
    const reframe = await runStructured({
      model: FAST_MODEL,
      system: `${roleAndBoundaries(state.locale)}\n\nThe idea has been assessed as Pivot. Propose exactly two adjacent problem framings the team could pursue instead, connected to what they already learned but addressing the weakness that triggered Pivot.`,
      messages: [
        {
          role: "user",
          content: `${ideaRecordContext(idea)}\n\nAssessment dimensions: ${JSON.stringify(state.draftAssessment.dimensions)}`,
        },
      ],
      schema: pivotReframingsSchema,
      maxTokens: MAX_OUTPUT_TOKENS,
      usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.pivot_reframe" },
    });
    pivotReframings = reframe.reframings;
  }

  const assessment: IdeaAssessment = {
    ideaId: idea.id,
    version,
    language: state.draftAssessment.language,
    dimensions: state.draftAssessment.dimensions,
    assumptionsToVerify: state.draftAssessment.assumptionsToVerify,
    topReasons: state.draftAssessment.topReasons,
    confidence: state.draftAssessment.confidence,
    weightedScore,
    verdict,
    hardRuleTriggered,
    pivotReframings,
    createdAt: new Date().toISOString(),
  };
  await saveIdeaAssessment(assessment);
  await logAction({
    entityType: "idea",
    entityId: idea.id,
    actorId: idea.ownerId,
    action: "assessment_created",
    detail: `v${version}: ${verdict} (score ${weightedScore})${hardRuleTriggered ? ` [rule: ${hardRuleTriggered}]` : ""}`,
  });

  return {};
}

export async function routeAfterVerdict(state: IdeaValidationStateType): Promise<"prototype_plan" | "closed"> {
  const idea = (await getIdeaById(state.ideaId))!;
  const assessment = (await getIdeaAssessment(idea.id, idea.currentAssessmentVersion))!;
  return assessment.verdict === "pivot" ? "closed" : "prototype_plan";
}

export async function prototypePlanNode(state: IdeaValidationStateType) {
  const idea = (await getIdeaById(state.ideaId))!;
  await setIdeaStage(idea.id, "prototype_plan");
  const assessment = (await getIdeaAssessment(idea.id, idea.currentAssessmentVersion))!;

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}

Current stage: PROTOTYPE_PLAN. Identify the riskiest assumption behind this idea. Working down the fidelity ladder from rung 1, select the lowest-fidelity prototype that could test that assumption, plus one alternative. Never recommend building the full solution. Explain why you did not choose a higher-fidelity option. Each option needs a concrete test protocol, number of users, metric, success threshold and what the team does if the threshold is missed.`,
    cacheableSystem: ideaSkillsBlock(),
    messages: [
      { role: "user", content: `${ideaRecordContext(idea)}\n\nAssessment: ${JSON.stringify(assessment)}` },
    ],
    schema: prototypePlanModelOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: idea.ownerId, ideaId: idea.id, stage: "idea.prototype_plan" },
  });

  const plan: PrototypePlan = {
    ideaId: idea.id,
    version: assessment.version,
    riskiestAssumption: result.riskiestAssumption,
    primary: result.primary as PrototypeOption,
    alternative: result.alternative as PrototypeOption,
    whyNotHigherFidelity: result.whyNotHigherFidelity,
    createdAt: new Date().toISOString(),
  };
  await savePrototypePlan(plan);

  return {};
}

export async function closedNode(state: IdeaValidationStateType) {
  await setIdeaStage(state.ideaId, "closed");
  return {};
}
