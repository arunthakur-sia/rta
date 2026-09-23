import { getPitchViewData } from "@/lib/agents/pitch-validation/viewData";
import { DeckUploadPanel } from "@/components/pitch/DeckUploadPanel";
import { ParseCheckPanel } from "@/components/pitch/ParseCheckPanel";
import { PitchStudioView } from "@/components/pitch/PitchStudioView";
import { RunAgentButton } from "@/components/pitch/RunAgentButton";
import { Card, CardBody } from "@/components/ui/Card";

export default async function PitchStudioPage({ params }: { params: Promise<{ pitchId: string }> }) {
  const { pitchId } = await params;
  const { pitch, run } = await getPitchViewData(pitchId);

  if (pitch.slides.length === 0) {
    return <DeckUploadPanel pitchId={pitchId} />;
  }

  if (!pitch.parseConfirmed) {
    return <ParseCheckPanel pitchId={pitchId} slides={pitch.slides} />;
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm font-medium text-ink-900">{pitch.deckFileName ?? "Uploaded deck"}</p>
              <p className="text-xs text-ink-500">{pitch.slides.length} slides parsed</p>
            </div>
            <RunAgentButton pitchId={pitchId} />
          </CardBody>
        </Card>
        <details className="no-print">
          <summary className="cursor-pointer text-sm text-ink-500">Upload a different deck</summary>
          <div className="mt-2">
            <DeckUploadPanel pitchId={pitchId} />
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PitchStudioView slides={pitch.slides} comments={run.comments} />
      <details className="no-print">
        <summary className="cursor-pointer text-sm text-ink-500">Upload a revised deck</summary>
        <div className="mt-2">
          <DeckUploadPanel pitchId={pitchId} />
        </div>
      </details>
    </div>
  );
}
