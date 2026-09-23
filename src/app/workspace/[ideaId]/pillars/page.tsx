import { notFound } from "next/navigation";
import { getIdeaAssessment, getIdeaById } from "@/lib/db/queries/ideas";
import { IdeaPillarsClient } from "@/components/idea/IdeaPillarsClient";

export default async function IdeaPillarsPage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await params;
  const idea = await getIdeaById(ideaId);
  if (!idea) notFound();

  const assessment = idea.currentAssessmentVersion > 0 ? await getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : null;

  return <IdeaPillarsClient idea={idea} assessment={assessment} />;
}
