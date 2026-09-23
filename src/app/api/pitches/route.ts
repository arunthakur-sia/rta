import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPitch, listPitchesForIdea, listPitchesForOwner } from "@/lib/db/queries/pitches";
import { getIdeaById } from "@/lib/db/queries/ideas";
import { getServerLocale } from "@/lib/i18n/locale.server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const ideaId = searchParams.get("ideaId");

  if (ideaId) return NextResponse.json({ pitches: await listPitchesForIdea(ideaId) });

  return NextResponse.json({ pitches: await listPitchesForOwner(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const locale = await getServerLocale();
  const body = (await request.json()) as { ideaId: string };

  const idea = await getIdeaById(body.ideaId);
  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });

  const pitch = await createPitch({ ideaId: idea.id, ownerId: user.id, language: locale });
  return NextResponse.json({ pitch }, { status: 201 });
}
