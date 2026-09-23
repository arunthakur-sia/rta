"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { PrototypePlanView } from "@/components/idea/PrototypePlanView";
import { FollowUpPanel } from "@/components/idea/FollowUpPanel";
import { ScorecardExtras } from "@/components/idea/ScorecardView";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Idea, IdeaAssessment, PrototypePlan } from "@/lib/types/domain";

const copy = {
  empty: {
    en: "Nothing here yet — the prototype plan fills in once a scored assessment exists.",
    ar: "لا يوجد شيء هنا بعد — ستظهر خطة النموذج الأولي بعد صدور تقييم.",
  },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function IdeaPlanClient({
  idea,
  assessment,
  prototypePlan,
}: {
  idea: Idea;
  assessment: IdeaAssessment | null;
  prototypePlan: PrototypePlan | null;
}) {
  const { locale } = useLocale();

  const hasAnything = Boolean(prototypePlan) || Boolean(assessment);

  if (!hasAnything) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-600">{t(copy.empty, locale)}</p>
        </CardBody>
      </Card>
    );
  }

  const showFollowUp = idea.stage === "closed" && assessment?.verdict === "ready_to_prototype";

  return (
    <div className="space-y-6">
      {prototypePlan && <PrototypePlanView plan={prototypePlan} />}

      {assessment && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-4">{showFollowUp && <FollowUpPanel ideaId={idea.id} />}</div>
          <div className="space-y-4">
            <ScorecardExtras assessment={assessment} />
          </div>
        </div>
      )}
    </div>
  );
}
