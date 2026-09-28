import { NextResponse } from "next/server";
import { getPitchById, getPitchRun } from "@/lib/db/queries/pitches";
import { getPendingPitchInterrupt, startPitchValidationRun } from "@/lib/agents/pitch-validation/runner";
import { toErrorResponse } from "@/lib/http/errors";

interface Params {
  params: Promise<{ pitchId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { pitchId } = await params;
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pendingInterrupt = await getPendingPitchInterrupt(pitchId);
  return NextResponse.json({ stage: pitch.stage, pendingInterrupt });
}

export async function POST(_request: Request, { params }: Params) {
  const { pitchId } = await params;
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!pitch.parseConfirmed) {
    return NextResponse.json({ error: "Confirm the parsed slides before running the agent" }, { status: 400 });
  }

  // A re-run must analyze an actually-updated deck — otherwise it's a fresh, non-deterministic
  // pass over the identical input, which can make scores drift either way with nothing having
  // changed. Gate on deck_version rather than trusting the client to only offer the button once
  // a new deck exists (see ReadinessDashboard.tsx, which also hides the button client-side).
  if (pitch.currentRunVersion > 0) {
    const currentRun = await getPitchRun(pitchId, pitch.currentRunVersion);
    const isCompletedRun = currentRun && currentRun.verdict !== null;
    if (isCompletedRun && currentRun.deckVersion >= pitch.deckVersion) {
      return NextResponse.json({ error: "Upload a revised deck before re-running the agent" }, { status: 400 });
    }
  }

  try {
    const result = await startPitchValidationRun(pitchId);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
