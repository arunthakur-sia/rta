import { notFound } from "next/navigation";
import { getIdeaAssessment, getIdeaById, getLatestPrototypePlan } from "@/lib/db/queries/ideas";
import { requireUser } from "@/lib/auth/session";
import { IdeaPlanClient } from "@/components/idea/IdeaPlanClient";

export default async function IdeaPlanPage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await params;
  const idea = await getIdeaById(ideaId);
  if (!idea) notFound();

  await requireUser();
  const prototypePlan = await getLatestPrototypePlan(idea.id);
  const assessment = idea.currentAssessmentVersion > 0 ? await getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : null;

  return <IdeaPlanClient idea={idea} assessment={assessment} prototypePlan={prototypePlan} />;
}
