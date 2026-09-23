import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createIdea, listIdeasForOwner } from "@/lib/db/queries/ideas";
import { getServerLocale } from "@/lib/i18n/locale.server";
import type { IdeaCanvas, TeamProfile } from "@/lib/types/domain";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const ideas = await listIdeasForOwner(user.id);
  return NextResponse.json({ ideas });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const locale = await getServerLocale();
  const body = (await request.json()) as { title: string; canvas: IdeaCanvas; team: TeamProfile };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const idea = await createIdea({
    ownerId: user.id,
    title: body.title.trim(),
    canvas: body.canvas,
    team: body.team,
    language: locale,
  });

  return NextResponse.json({ idea }, { status: 201 });
}
