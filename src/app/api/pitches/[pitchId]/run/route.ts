import { NextResponse } from "next/server";
import { getPitchById } from "@/lib/db/queries/pitches";
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

  try {
    const result = await startPitchValidationRun(pitchId);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
