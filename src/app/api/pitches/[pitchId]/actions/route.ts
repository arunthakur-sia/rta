import { NextResponse } from "next/server";
import { getPitchById, setActionDone } from "@/lib/db/queries/pitches";
import { toErrorResponse } from "@/lib/http/errors";

interface Params {
  params: Promise<{ pitchId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { pitchId } = await params;
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pitch.currentRunVersion === 0) {
    return NextResponse.json({ error: "No run to update yet" }, { status: 400 });
  }

  const body = (await request.json()) as { priority?: number; done?: boolean };
  if (typeof body.priority !== "number" || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "priority and done are required" }, { status: 400 });
  }

  try {
    await setActionDone(pitchId, pitch.currentRunVersion, body.priority, body.done);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
