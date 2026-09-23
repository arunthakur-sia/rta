import { getPitchById, getPitchRun, listPitchRuns } from "@/lib/db/queries/pitches";
import { getIdeaAssessment, getIdeaById, getLatestPrototypePlan } from "@/lib/db/queries/ideas";
import { getPendingPitchInterrupt } from "./runner";
import { notFound } from "next/navigation";

export async function getPitchViewData(pitchId: string) {
  const pitch = await getPitchById(pitchId);
  if (!pitch) notFound();

  const idea = (await getIdeaById(pitch.ideaId))!;

  const [assessment, plan, run, allRuns, pendingInterrupt] = await Promise.all([
    idea.currentAssessmentVersion > 0 ? getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : Promise.resolve(null),
    getLatestPrototypePlan(idea.id),
    pitch.currentRunVersion > 0 ? getPitchRun(pitch.id, pitch.currentRunVersion) : Promise.resolve(null),
    listPitchRuns(pitch.id),
    getPendingPitchInterrupt(pitchId),
  ]);

  return { pitch, idea, assessment, plan, run, allRuns, pendingInterrupt };
}

export type PitchViewData = Awaited<ReturnType<typeof getPitchViewData>>;
