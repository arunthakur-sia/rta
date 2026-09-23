import { NextResponse } from "next/server";
import { getIdeaById } from "@/lib/db/queries/ideas";
import { checkCanvasCompleteness } from "@/lib/validation/ideaCanvas";
import { getPendingIdeaInterrupt, startIdeaValidationSession } from "@/lib/agents/idea-validation/runner";
import { toErrorResponse } from "@/lib/http/errors";

interface Params {
  params: Promise<{ ideaId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { ideaId } = await params;
  const idea = await getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pendingInterrupt = await getPendingIdeaInterrupt(ideaId);
  return NextResponse.json({ stage: idea.stage, pendingInterrupt });
}

export async function POST(_request: Request, { params }: Params) {
  const { ideaId } = await params;
  const idea = await getIdeaById(ideaId);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const completeness = checkCanvasCompleteness(idea.canvas, idea.team);
  if (!completeness.complete) {
    return NextResponse.json({ error: "Canvas incomplete", missingFields: completeness.missingFields }, { status: 400 });
  }

  try {
    const result = await startIdeaValidationSession(ideaId);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
