import { getPitchViewData } from "@/lib/agents/pitch-validation/viewData";
import { ReadinessDashboard } from "@/components/pitch/ReadinessDashboard";
import { RunAgentButton } from "@/components/pitch/RunAgentButton";
import { Card, CardBody } from "@/components/ui/Card";

export default async function ReadinessPage({ params }: { params: Promise<{ pitchId: string }> }) {
  const { pitchId } = await params;
  const { run, allRuns } = await getPitchViewData(pitchId);

  if (!run) {
    return (
      <Card>
        <CardBody>
          <RunAgentButton pitchId={pitchId} />
        </CardBody>
      </Card>
    );
  }

  // Structure/content/coherence are saved as soon as they're ready, but
  // readiness scoring only runs after all mock jury turns are answered.
  const { verdict, readinessScore, dimensions, actions } = run;
  if (verdict === null || readinessScore === null || !dimensions || !actions) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-500">
          {"The agent hasn't finished mock jury yet — readiness is scored right after. Check the Mock Jury tab."}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ReadinessDashboard run={{ ...run, verdict, readinessScore, dimensions, actions }} allRuns={allRuns} />
      <RunAgentButton pitchId={pitchId} isRerun />
    </div>
  );
}
