import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { getPitchById } from "@/lib/db/queries/pitches";
import { juryPersonas, MOCK_JURY_QUESTION_COUNT } from "@/lib/skills/pitchRubric";
import { pitchValidationGraph } from "./graph";
import { evaluateMockJuryAnswer } from "./nodes";
import type { MockJuryInterruptPayload } from "./nodes";

export type PitchSessionInterrupt = MockJuryInterruptPayload;

export interface PitchSessionResult {
  status: "interrupted" | "completed";
  interrupt?: PitchSessionInterrupt;
}

function threadConfig(pitchId: string) {
  return { configurable: { thread_id: pitchId } };
}

function extractInterrupt(result: unknown): PitchSessionInterrupt | undefined {
  if (isInterrupted<PitchSessionInterrupt>(result)) {
    const interrupts = (result as Record<string, { value?: PitchSessionInterrupt }[]>)[INTERRUPT];
    return interrupts[0]?.value;
  }
  return undefined;
}

export async function startPitchValidationRun(pitchId: string): Promise<PitchSessionResult> {
  const pitch = await getPitchById(pitchId);
  if (!pitch) throw new Error("Pitch not found");
  const result = await pitchValidationGraph.invoke({ pitchId, locale: pitch.language }, threadConfig(pitchId));
  const interrupt = extractInterrupt(result);
  return interrupt ? { status: "interrupted", interrupt } : { status: "completed" };
}

export async function resumePitchValidationRun(pitchId: string, resumeValue: string): Promise<PitchSessionResult> {
  const pending = await getLivePitchInterrupt(pitchId);
  if (!pending) {
    // No live checkpoint for this thread (most likely the dev/prod server
    // process restarted, or a hot reload wiped it — checkpoints are
    // in-memory, see graph.ts). A Command({resume}) against a thread with
    // no checkpoint is silently a no-op, not an error, so it must NOT be
    // used here.
    //
    // The durable mock jury turn a pending answer belongs to is
    // identifiable (reconstructPendingInterrupt), so score and save the
    // answer directly against that row — same evaluation the graph node
    // would have done — before starting a fresh run. Otherwise the
    // participant's answer would be silently discarded: a fresh run finds
    // the turn already sitting there unanswered and just re-asks it.
    const reconstructed = await reconstructPendingInterrupt(pitchId);
    if (reconstructed) {
      const pitch = (await getPitchById(pitchId))!;
      const turn = pitch.mockJuryLog.find((t) => t.id === reconstructed.turnId);
      const persona = juryPersonas.find((p) => p.id === reconstructed.personaId);
      if (turn && !turn.answer && persona) {
        await evaluateMockJuryAnswer(pitchId, pitch.language, turn, persona, resumeValue);
      }
    }
    return startPitchValidationRun(pitchId);
  }
  const result = await pitchValidationGraph.invoke(new Command({ resume: resumeValue }), threadConfig(pitchId));
  const interrupt = extractInterrupt(result);
  return interrupt ? { status: "interrupted", interrupt } : { status: "completed" };
}

/** The live LangGraph checkpoint only — no durable reconstruction. See `getPendingPitchInterrupt` for why the two must stay separate. */
async function getLivePitchInterrupt(pitchId: string): Promise<PitchSessionInterrupt | null> {
  const snapshot = await pitchValidationGraph.getState(threadConfig(pitchId));
  if (!snapshot.next || snapshot.next.length === 0) return null;
  const task = snapshot.tasks.find((t) => t.interrupts.length > 0);
  return (task?.interrupts[0]?.value as PitchSessionInterrupt | undefined) ?? null;
}

/**
 * For reads (rendering the UI) only — never use this to decide whether a
 * resume can be delivered (see `resumePitchValidationRun`, which needs to
 * know whether a live checkpoint specifically exists, not whether the
 * pending question can be reconstructed from durable state).
 *
 * Prefers the live LangGraph checkpoint (cheap, no extra queries), but the
 * checkpointer is an in-memory MemorySaver (see graph.ts) — it does not
 * survive a dev-server hot reload or, in production, a request landing on a
 * different server instance. The pending mock jury question is fully
 * reconstructable from durable Supabase state (it was already saved by
 * addMockJuryQuestion before the interrupt fired), so fall back to
 * rebuilding it from the database rather than leaving the UI with nothing
 * to show for a question that has, durably, already been asked.
 */
export async function getPendingPitchInterrupt(pitchId: string): Promise<PitchSessionInterrupt | null> {
  const live = await getLivePitchInterrupt(pitchId);
  return live ?? reconstructPendingInterrupt(pitchId);
}

async function reconstructPendingInterrupt(pitchId: string): Promise<PitchSessionInterrupt | null> {
  const pitch = await getPitchById(pitchId);
  if (!pitch) return null;

  const turn = pitch.mockJuryLog.find((t) => t.answer === null);
  if (!turn) return null;
  const persona = juryPersonas.find((p) => p.id === turn.personaId);
  if (!persona) return null;

  const turnNumber = pitch.mockJuryLog.filter((t) => t.answer !== null).length + 1;
  const payload: MockJuryInterruptPayload = {
    type: "mock_jury_question",
    turnId: turn.id,
    personaId: persona.id,
    personaName: persona.name,
    question: turn.question,
    turnNumber,
    totalTurns: MOCK_JURY_QUESTION_COUNT,
  };
  return payload;
}
