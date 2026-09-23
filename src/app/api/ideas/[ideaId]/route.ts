import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteIdea, getIdeaAssessment, getIdeaById, getLatestPrototypePlan, updateIdeaCanvas } from "@/lib/db/queries/ideas";
import { listAuditLog } from "@/lib/db/queries/auditLog";
import type { IdeaCanvas, TeamProfile } from "@/lib/types/domain";

interface Params {
  params: Promise<{ ideaId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { ideaId } = await params;
  const idea = await getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [assessment, prototypePlan, auditLog] = await Promise.all([
    idea.currentAssessmentVersion > 0 ? getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : Promise.resolve(null),
    getLatestPrototypePlan(idea.id),
    listAuditLog("idea", idea.id),
  ]);

  return NextResponse.json({ idea, assessment, prototypePlan, auditLog });
}

export async function PATCH(request: Request, { params }: Params) {
  const { ideaId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const idea = await getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (idea.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { canvas: IdeaCanvas; team: TeamProfile };
  await updateIdeaCanvas(ideaId, body.canvas, body.team);
  return NextResponse.json({ idea: await getIdeaById(ideaId) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { ideaId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const idea = await getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (idea.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteIdea(ideaId);
  return NextResponse.json({ ok: true });
}
