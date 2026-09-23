import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { answerClarification, getIdeaById } from "@/lib/db/queries/ideas";
import { MAX_CLARIFYING_QUESTIONS } from "@/lib/skills/clarifyingQuestions";
import { ideaValidationGraph } from "./graph";
import type { ClarifyInterruptPayload } from "./nodes";

export type IdeaSessionInterrupt = ClarifyInterruptPayload;

export interface IdeaSessionResult {
  status: "interrupted" | "completed";
  interrupt?: IdeaSessionInterrupt;
}

function threadConfig(ideaId: string) {
  return { configurable: { thread_id: ideaId } };
}

function extractInterrupt(result: unknown): IdeaSessionInterrupt | undefined {
  if (isInterrupted<IdeaSessionInterrupt>(result)) {
    const interrupts = (result as Record<string, { value?: IdeaSessionInterrupt }[]>)[INTERRUPT];
    return interrupts[0]?.value;
  }
  return undefined;
}

export async function startIdeaValidationSession(ideaId: string): Promise<IdeaSessionResult> {
  const idea = await getIdeaById(ideaId);
  if (!idea) throw new Error("Idea not found");
  const result = await ideaValidationGraph.invoke({ ideaId, locale: idea.language }, threadConfig(ideaId));
  const interrupt = extractInterrupt(result);
  return interrupt ? { status: "interrupted", interrupt } : { status: "completed" };
}

export async function resumeIdeaValidationSession(ideaId: string, resumeValue: string): Promise<IdeaSessionResult> {
  const pending = await getLiveIdeaInterrupt(ideaId);
  if (!pending) {
    // No live checkpoint for this thread (most likely the dev/prod server
    // process restarted, or a hot reload wiped it — checkpoints are
    // in-memory, see graph.ts). A Command({resume}) against a thread with
    // no checkpoint is silently a no-op, not an error, so it must NOT be
    // used here.
    //
    // The durable clarification row a pending answer belongs to is
    // identifiable (reconstructPendingInterrupt), so apply the answer
    // directly to that row before starting a fresh graph run — clarifyNode
    // will then see it as already answered and move on to the next
    // question instead of re-asking the same one and losing the answer.
    const reconstructed = await reconstructPendingInterrupt(ideaId);
    if (reconstructed?.type === "clarify_question") {
      await answerClarification(reconstructed.clarificationId, resumeValue);
    }
    return startIdeaValidationSession(ideaId);
  }
  const result = await ideaValidationGraph.invoke(new Command({ resume: resumeValue }), threadConfig(ideaId));
  const interrupt = extractInterrupt(result);
  return interrupt ? { status: "interrupted", interrupt } : { status: "completed" };
}

/** The live LangGraph checkpoint only — no durable reconstruction. See `getPendingIdeaInterrupt` for why the two must stay separate. */
async function getLiveIdeaInterrupt(ideaId: string): Promise<IdeaSessionInterrupt | null> {
  const snapshot = await ideaValidationGraph.getState(threadConfig(ideaId));
  if (!snapshot.next || snapshot.next.length === 0) return null;
  const task = snapshot.tasks.find((t) => t.interrupts.length > 0);
  return (task?.interrupts[0]?.value as IdeaSessionInterrupt | undefined) ?? null;
}

/**
 * For reads (rendering the UI) only — never use this to decide whether a
 * resume can be delivered (see `resumeIdeaValidationSession`, which needs
 * to know whether a live checkpoint specifically exists, not whether the
 * pending question can be reconstructed from durable state).
 *
 * Prefers the live LangGraph checkpoint (cheap, no extra queries), but the
 * checkpointer is an in-memory MemorySaver (see graph.ts) — it does not
 * survive a dev-server hot reload or, in production, a request landing on a
 * different server instance. The pending clarification row is fully
 * reconstructable from durable Supabase state, so fall back to rebuilding
 * the interrupt from the database rather than leaving the UI with nothing
 * to show for a session that has, durably, already started.
 */
export async function getPendingIdeaInterrupt(ideaId: string): Promise<IdeaSessionInterrupt | null> {
  const live = await getLiveIdeaInterrupt(ideaId);
  return live ?? reconstructPendingInterrupt(ideaId);
}

async function reconstructPendingInterrupt(ideaId: string): Promise<IdeaSessionInterrupt | null> {
  const idea = await getIdeaById(ideaId);
  if (!idea) return null;

  if (idea.stage === "clarify") {
    const pending = idea.clarifications.find((c) => !c.answer);
    if (!pending) return null;
    const answeredCount = idea.clarifications.filter((c) => c.answer).length;
    const payload: ClarifyInterruptPayload = {
      type: "clarify_question",
      clarificationId: pending.id,
      question: pending.question,
      whyWeAsk: pending.whyWeAsk,
      dimension: pending.dimension,
      askedCount: answeredCount + 1,
      maxQuestions: MAX_CLARIFYING_QUESTIONS,
    };
    return payload;
  }

  return null;
}
