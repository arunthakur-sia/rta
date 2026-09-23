import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listIdeasForOwner, getIdeaAssessment } from "@/lib/db/queries/ideas";
import { getServerLocale } from "@/lib/i18n/locale.server";
import { Card, CardBody } from "@/components/ui/Card";
import { IdeaVerdictBadge, Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ideaVerdictLabels, label, programPhaseLabels } from "@/lib/skills/glossary";
import { common, t } from "@/lib/i18n/common";
import { phaseForIdea } from "@/lib/agents/idea-validation/phase";

export default async function WorkspaceListPage() {
  const user = await requireUser();
  const locale = await getServerLocale();
  const ideas = await listIdeasForOwner(user.id);

  const rows = await Promise.all(
    ideas.map(async (idea) => {
      const assessment = idea.currentAssessmentVersion > 0 ? await getIdeaAssessment(idea.id, idea.currentAssessmentVersion) : null;
      return { idea, assessment, phase: phaseForIdea(idea, assessment) };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{t(common.ideas, locale)}</h1>
        <Link href="/workspace/new" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600">
          {t(common.newIdea, locale)}
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-ink-500">
            {locale === "ar" ? "لا توجد أفكار بعد." : "No ideas yet."}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ idea, assessment, phase }) => (
            <Card key={idea.id} className="relative h-full transition-shadow hover:shadow-md">
              <Link href={`/workspace/${idea.id}`} className="block">
                <CardBody className="space-y-2">
                  <h2 className="pr-14 font-medium text-ink-900">{idea.title}</h2>
                  <p className="line-clamp-2 text-sm text-ink-500">{idea.canvas.prioritisedChallenge}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge>{label(programPhaseLabels[phase - 1], locale)}</Badge>
                    {assessment && <IdeaVerdictBadge verdict={assessment.verdict} label={label(ideaVerdictLabels[assessment.verdict], locale)} />}
                  </div>
                </CardBody>
              </Link>
              {idea.ownerId === user.id && (
                <DeleteButton
                  deleteUrl={`/api/ideas/${idea.id}`}
                  confirmMessage={{
                    en: "Delete this idea and everything built from it (pitches, assessments, evidence)? This cannot be undone.",
                    ar: "حذف هذه الفكرة وكل ما تم بناؤه منها (العروض، التقييمات، الأدلة)؟ لا يمكن التراجع عن هذا.",
                  }}
                  className="absolute right-4 top-4 text-xs font-medium text-ink-400 hover:text-verdict-pivot"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
