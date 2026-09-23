import { interrupt } from "@langchain/langgraph";
import { runStructured } from "@/lib/llm/structured";
import { CAPABLE_MODEL, FAST_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/llm/models";
import {
  coherenceOutputSchema,
  contentOutputSchema,
  mockJuryEvaluationSchema,
  mockJuryQuestionSchema,
  readinessOutputSchema,
  structureOutputSchema,
} from "@/lib/schemas/pitch";
import { juryPersonas, MOCK_JURY_QUESTION_COUNT, type JuryPersona } from "@/lib/skills/pitchRubric";
import { computePitchReadiness } from "@/lib/scoring/pitchReadiness";
import { deriveActions } from "./actions";
import {
  addMockJuryQuestion,
  answerMockJuryQuestion,
  getPitchById,
  nextPitchRunVersion,
  savePitchRun,
  setPitchStage,
} from "@/lib/db/queries/pitches";
import { getIdeaAssessment, getIdeaById, getLatestPrototypePlan } from "@/lib/db/queries/ideas";
import { logAction } from "@/lib/db/queries/auditLog";
import { deckContext, ideaRecordSummary, pitchSkillsBlock, roleAndBoundaries } from "./prompts";
import type { PitchValidationStateType } from "./state";
import type { MockJuryTurn, Pitch, PitchDimensionRating, PitchRun, SlideComment } from "@/lib/types/domain";

async function loadContext(pitchId: string) {
  const pitch = (await getPitchById(pitchId))!;
  const idea = (await getIdeaById(pitch.ideaId))!;
  const assessment = idea.currentAssessmentVersion > 0 ? await getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : null;
  const plan = await getLatestPrototypePlan(idea.id);
  return { pitch, idea, assessment, plan };
}

export interface MockJuryInterruptPayload {
  type: "mock_jury_question";
  turnId: string;
  personaId: string;
  personaName: string;
  question: string;
  turnNumber: number;
  totalTurns: number;
}

export async function uploadNode(state: PitchValidationStateType) {
  await setPitchStage(state.pitchId, "upload");
  return {};
}

export async function parseCheckNode(state: PitchValidationStateType) {
  await setPitchStage(state.pitchId, "parse_check");
  return {};
}

export async function structureNode(state: PitchValidationStateType) {
  const { pitch, idea, assessment, plan } = await loadContext(state.pitchId);
  await setPitchStage(pitch.id, "structure");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}\n\nCurrent stage: STRUCTURE. Map every slide to the RTA pitch template section it belongs to. List missing sections and any ordering issues, and suggest a full slide order (as an array of slide indices, 0-based).`,
    cacheableSystem: pitchSkillsBlock(state.locale),
    messages: [{ role: "user", content: `${deckContext(pitch)}\n\n${ideaRecordSummary(idea, assessment, plan)}` }],
    schema: structureOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.structure" },
  });

  // Reserve the run version here and upsert a first pass at it so the
  // Structure Map / Pitch Studio / Coherence Report tabs have something to
  // show as soon as each stage finishes, instead of staying empty until
  // mock jury and readiness are done (see savePitchRun's doc comment).
  const version = await nextPitchRunVersion(pitch.id);
  await savePitchRun({
    pitchId: pitch.id,
    version,
    language: state.locale,
    structure: result,
    comments: [],
    coherence: [],
    dimensions: null,
    actions: null,
    readinessScore: null,
    verdict: null,
    hardRuleTriggered: null,
    createdAt: new Date().toISOString(),
  });

  return { structureResult: result, runVersion: version };
}

export async function contentNode(state: PitchValidationStateType) {
  const { pitch, idea, assessment, plan } = await loadContext(state.pitchId);
  await setPitchStage(pitch.id, "content");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}\n\nCurrent stage: CONTENT. For each slide that needs work, return: the message it should carry, why the current version doesn't (as "issue"), a concrete rewrite, and a priority. Flag word count above 40, more than one chart, or unreadable tables as visual issues. Only include slides that need a change — skip slides that are already clear.`,
    cacheableSystem: pitchSkillsBlock(state.locale),
    messages: [{ role: "user", content: `${deckContext(pitch)}\n\n${ideaRecordSummary(idea, assessment, plan)}` }],
    schema: contentOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.content" },
  });
  // The model doesn't return `resolved` — it's a participant-tracked flag,
  // not a model output — so default it here rather than leaving it undefined.
  const comments: SlideComment[] = result.comments.map((c) => ({ ...c, resolved: false }));

  await savePitchRun({
    pitchId: pitch.id,
    version: state.runVersion!,
    language: state.locale,
    structure: state.structureResult!,
    comments,
    coherence: [],
    dimensions: null,
    actions: null,
    readinessScore: null,
    verdict: null,
    hardRuleTriggered: null,
    createdAt: new Date().toISOString(),
  });

  return { comments };
}

export async function coherenceNode(state: PitchValidationStateType) {
  const { pitch, idea, assessment, plan } = await loadContext(state.pitchId);
  await setPitchStage(pitch.id, "coherence");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}\n\nCurrent stage: COHERENCE. Extract every factual claim in the deck (numbers, user counts, test results, outcomes) and check it against the validated idea record below. Mark each: supported (matches the record), overstated (stronger than the evidence), changed (a number moved without explanation), or unsupported (no basis in the record at all). This is what makes the two agents a system rather than two tools — be strict.`,
    cacheableSystem: pitchSkillsBlock(state.locale),
    messages: [{ role: "user", content: `${deckContext(pitch)}\n\n${ideaRecordSummary(idea, assessment, plan)}` }],
    schema: coherenceOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.coherence" },
  });

  await savePitchRun({
    pitchId: pitch.id,
    version: state.runVersion!,
    language: state.locale,
    structure: state.structureResult!,
    comments: state.comments,
    coherence: result.rows,
    dimensions: null,
    actions: null,
    readinessScore: null,
    verdict: null,
    hardRuleTriggered: null,
    createdAt: new Date().toISOString(),
  });

  return { coherenceRows: result.rows };
}

/**
 * Runs exactly one mock jury turn per invocation — routeAfterMockJury below
 * loops this node back to itself at the *graph* level until
 * MOCK_JURY_QUESTION_COUNT turns are done, rather than looping with a
 * `while` inside one node call. Same reasoning as clarifyNode: LangGraph
 * replays a node's whole body from the top on every resume of a paused
 * task, memoizing only the `interrupt()` calls themselves, so a shared
 * multi-turn loop would re-run the question-generation and evaluation
 * model calls (and their DB writes) on every resume. Scoping one turn to
 * one task, plus reusing an already-pending unanswered turn if this exact
 * task gets replayed, makes it replay-safe.
 */
export async function mockJuryNode(state: PitchValidationStateType) {
  const pitch = (await getPitchById(state.pitchId))!;
  await setPitchStage(pitch.id, "mock_jury");

  if (pitch.mockJuryLog.length >= MOCK_JURY_QUESTION_COUNT) {
    return {};
  }

  let turn = pitch.mockJuryLog.find((t) => t.answer === null);
  let persona = turn ? juryPersonas.find((p) => p.id === turn!.personaId) : undefined;

  if (!turn) {
    const turnIndex = pitch.mockJuryLog.length;
    persona = juryPersonas[turnIndex % juryPersonas.length];
    const { idea, assessment, plan } = await loadContext(state.pitchId);

    const weakPoints = [
      ...state.comments.filter((c) => c.priority === "high").map((c) => `Slide ${c.slide + 1}: ${c.issue}`),
      ...state.coherenceRows.filter((c) => c.status !== "supported").map((c) => `Coherence: ${c.claim} (${c.status})`),
    ];
    const priorQA = pitch.mockJuryLog.map((t) => `Q: ${t.question}\nA: ${t.answer ?? "(unanswered)"}`).join("\n\n");

    const generated = await runStructured({
      model: FAST_MODEL,
      system: `${roleAndBoundaries(state.locale)}\n\nCurrent stage: MOCK_JURY. You are playing the persona "${persona.name}" (${persona.role}). Focus: ${persona.focus}. Ask one sharp question for this pitch, drawn from the weak points below where possible. Never repeat a question already asked.`,
      messages: [
        {
          role: "user",
          content: `${deckContext(pitch)}\n\n${ideaRecordSummary(idea, assessment, plan)}\n\nWeak points found so far:\n${weakPoints.join("\n") || "(none flagged)"}\n\nQuestions already asked:\n${priorQA || "(none yet)"}`,
        },
      ],
      schema: mockJuryQuestionSchema,
      maxTokens: MAX_OUTPUT_TOKENS,
      usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.mock_jury_question" },
    });

    turn = await addMockJuryQuestion(pitch.id, persona.id, generated.question, generated.weakPointRef);
  }

  const finalPersona = persona!;
  const turnNumber = pitch.mockJuryLog.filter((t) => t.answer !== null).length + 1;

  const answer = interrupt<MockJuryInterruptPayload, string>({
    type: "mock_jury_question",
    turnId: turn.id,
    personaId: finalPersona.id,
    personaName: finalPersona.name,
    question: turn.question,
    turnNumber,
    totalTurns: MOCK_JURY_QUESTION_COUNT,
  });

  if (!turn.answer) {
    await evaluateMockJuryAnswer(state.pitchId, state.locale, turn, finalPersona, answer);
  }

  return {};
}

/**
 * Scores one submitted mock jury answer and records it. Split out of
 * mockJuryNode so the runner's checkpoint-recovery path (see
 * pitch-validation/runner.ts — the in-memory LangGraph checkpoint doesn't
 * survive a dev-server hot reload) can score and save an answer that
 * arrives with no live interrupt to resume, without duplicating the
 * evaluation prompt.
 */
export async function evaluateMockJuryAnswer(
  pitchId: string,
  locale: "en" | "ar",
  turn: MockJuryTurn,
  persona: JuryPersona,
  answer: string
) {
  const { pitch, idea, assessment, plan } = await loadContext(pitchId);
  const evaluation = await runStructured({
    model: FAST_MODEL,
    system: `${roleAndBoundaries(locale)}\n\nEvaluate the participant's answer to the mock jury question as the "${persona.name}" persona. Be direct about whether the answer is backed by evidence.`,
    messages: [
      { role: "user", content: `${ideaRecordSummary(idea, assessment, plan)}\n\nQuestion: ${turn.question}\nAnswer: ${answer}` },
    ],
    schema: mockJuryEvaluationSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.mock_jury_evaluation" },
  });

  await answerMockJuryQuestion(turn.id, answer, evaluation.evaluation, evaluation.modelAnswer);
}

export async function routeAfterMockJury(state: PitchValidationStateType): Promise<"mock_jury" | "readiness"> {
  const pitch = (await getPitchById(state.pitchId))!;
  return pitch.mockJuryLog.length >= MOCK_JURY_QUESTION_COUNT ? "readiness" : "mock_jury";
}

export async function readinessNode(state: PitchValidationStateType) {
  const { pitch, idea, assessment, plan } = await loadContext(state.pitchId);
  await setPitchStage(pitch.id, "readiness");

  const currentPitch = (await getPitchById(pitch.id)) as Pitch;
  const juryLogText = currentPitch.mockJuryLog
    .map((t) => `Persona ${t.personaId} asked: ${t.question}\nAnswer: ${t.answer}\nEvaluation: ${t.evaluation}`)
    .join("\n\n");

  const result = await runStructured({
    model: CAPABLE_MODEL,
    system: `${roleAndBoundaries(state.locale)}\n\nCurrent stage: READINESS. Rate all seven pitch rubric dimensions 1-5 with a written anchor and evidence, drawing on the structure, content and coherence findings plus the mock jury log below.`,
    cacheableSystem: pitchSkillsBlock(state.locale),
    messages: [
      {
        role: "user",
        content: `${deckContext(pitch)}\n\n${ideaRecordSummary(idea, assessment, plan)}\n\nStructure: ${JSON.stringify(state.structureResult)}\nContent comments: ${JSON.stringify(state.comments)}\nCoherence: ${JSON.stringify(state.coherenceRows)}\nMock jury log:\n${juryLogText}`,
      },
    ],
    schema: readinessOutputSchema,
    maxTokens: MAX_OUTPUT_TOKENS,
    usage: { userId: pitch.ownerId, ideaId: pitch.ideaId, pitchId: pitch.id, stage: "pitch.readiness" },
  });

  const dimensions = result.dimensions as PitchDimensionRating[];
  const { readinessScore, verdict, hardRuleTriggered } = computePitchReadiness(dimensions, state.coherenceRows);
  const actions = deriveActions(state.comments, state.coherenceRows, dimensions, state.locale);

  const run: PitchRun = {
    pitchId: pitch.id,
    // Reuses the version reserved in structureNode so this finalizes the
    // same pitch_runs row that's been visible since structure completed,
    // instead of creating a second row.
    version: state.runVersion!,
    language: state.locale,
    structure: state.structureResult!,
    comments: state.comments,
    coherence: state.coherenceRows,
    dimensions,
    actions,
    readinessScore,
    verdict,
    hardRuleTriggered,
    createdAt: new Date().toISOString(),
  };
  await savePitchRun(run);
  await logAction({
    entityType: "pitch",
    entityId: pitch.id,
    actorId: pitch.ownerId,
    action: "run_created",
    detail: `v${run.version}: ${verdict} (score ${readinessScore})${hardRuleTriggered ? ` [rule: ${hardRuleTriggered}]` : ""}`,
  });

  return { dimensions };
}

export async function closedNode(state: PitchValidationStateType) {
  await setPitchStage(state.pitchId, "closed");
  return {};
}
