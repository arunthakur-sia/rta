import { getPitchViewData } from "@/lib/agents/pitch-validation/viewData";
import { MockJuryPanel } from "@/components/pitch/MockJuryPanel";
import { RunAgentButton } from "@/components/pitch/RunAgentButton";
import { Card, CardBody } from "@/components/ui/Card";
import { MOCK_JURY_QUESTION_COUNT } from "@/lib/skills/pitchRubric";
import type { MockJuryInterruptPayload } from "@/lib/agents/pitch-validation/nodes";

export default async function MockJuryPage({ params }: { params: Promise<{ pitchId: string }> }) {
  const { pitchId } = await params;
  const { pitch, pendingInterrupt } = await getPitchViewData(pitchId);

  const interrupt = pendingInterrupt?.type === "mock_jury_question" ? (pendingInterrupt as MockJuryInterruptPayload) : null;
  const mockJuryComplete = pitch.mockJuryLog.length >= MOCK_JURY_QUESTION_COUNT;

  // No pending question and mock jury isn't finished (fewer than
  // MOCK_JURY_QUESTION_COUNT turns logged) means the session stalled
  // between turns — most likely the in-memory LangGraph checkpoint was
  // lost right after an answer was scored but before the next question's
  // interrupt fired (see runner.ts). There's nothing durable left to
  // reconstruct an interrupt from, so offer a way to pick the run back up
  // instead of leaving whatever log exists as a dead end.
  if (!interrupt && !mockJuryComplete) {
    return (
      <div className="space-y-4">
        {pitch.mockJuryLog.length > 0 && <MockJuryPanel key="log" pitchId={pitchId} interrupt={null} log={pitch.mockJuryLog} />}
        <Card>
          <CardBody>
            <RunAgentButton pitchId={pitchId} isRerun={pitch.mockJuryLog.length > 0} />
          </CardBody>
        </Card>
      </div>
    );
  }

  // Keyed by turnId: without this, answering one question would leave the
  // panel mounted across the next question's turnId too, and its
  // `submitting` state (set true on submit, only ever reset via remount —
  // see MockJuryPanel's comment) would stay stuck, hiding the next
  // question's answer box behind a permanent "evaluating" state.
  return <MockJuryPanel key={interrupt?.turnId ?? "log"} pitchId={pitchId} interrupt={interrupt} log={pitch.mockJuryLog} />;
}
