import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePitch, getPitchById, getPitchRun, listPitchRuns } from "@/lib/db/queries/pitches";
import { listAuditLog } from "@/lib/db/queries/auditLog";

interface Params {
  params: Promise<{ pitchId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { pitchId } = await params;
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [run, allRuns, auditLog] = await Promise.all([
    pitch.currentRunVersion > 0 ? getPitchRun(pitch.id, pitch.currentRunVersion) : Promise.resolve(null),
    listPitchRuns(pitch.id),
    listAuditLog("pitch", pitch.id),
  ]);

  return NextResponse.json({ pitch, run, allRuns, auditLog });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { pitchId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pitch.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deletePitch(pitchId);
  await rm(path.join(process.cwd(), ".uploads", pitchId), { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
