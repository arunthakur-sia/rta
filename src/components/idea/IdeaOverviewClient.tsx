"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RadarChart } from "@/components/ui/RadarChart";
import { CanvasEditor } from "@/components/idea/CanvasEditor";
import { EvidencePanel } from "@/components/idea/EvidencePanel";
import { ClarifySessionPanel } from "@/components/idea/ClarifySessionPanel";
import { ScorecardSummary } from "@/components/idea/ScorecardView";
import { Spinner } from "@/components/ui/Spinner";
import { CyclingStatus } from "@/components/ui/CyclingStatus";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { checkCanvasCompleteness } from "@/lib/validation/ideaCanvas";
import { ideaDimensionLabels, label } from "@/lib/skills/glossary";
import type { IdeaSessionInterrupt } from "@/lib/agents/idea-validation/runner";
import type { Idea, IdeaAssessment, User } from "@/lib/types/domain";

const copy = {
  startTitle: { en: "Ready to validate", ar: "جاهز للتحقق" },
  startBody: {
    en: "Complete the canvas on the left, then start the validation session. The agent will ask up to eight adaptive questions, then produce a scored assessment and verdict.",
    ar: "أكمل اللوحة على اليسار، ثم ابدأ جلسة التحقق. سيطرح العامل حتى ثماني أسئلة تكيفية، ثم يصدر تقييمًا مُقيَّمًا وقرارًا نهائيًا.",
  },
  start: { en: "Start validation session", ar: "بدء جلسة التحقق" },
  incomplete: { en: "Finish the canvas fields marked above before starting.", ar: "أكمل حقول اللوحة المشار إليها أعلاه قبل البدء." },
  working: { en: "Working…", ar: "جارٍ العمل…" },
  lostTitle: { en: "Session in progress", ar: "الجلسة قيد التنفيذ" },
  lostBody: {
    en: "The session started but its next question isn't loaded on this server yet. Resume to pick up where it left off — no answers will be repeated.",
    ar: "بدأت الجلسة لكن سؤالها التالي لم يُحمَّل على هذا الخادم بعد. اضغط استئناف للمتابعة من حيث توقفت — لن تتكرر أي إجابات.",
  },
  resume: { en: "Resume session", ar: "استئناف الجلسة" },
  workingNote: {
    en: "This can take up to a minute.",
    ar: "قد يستغرق ذلك حتى دقيقة.",
  },
  networkError: { en: "Couldn't reach the server. Try again.", ar: "تعذر الوصول إلى الخادم. حاول مرة أخرى." },
};

const startSteps = {
  en: ["Reading your idea canvas…", "Checking the evidence pack…", "Preparing the first question…"],
  ar: ["قراءة لوحة فكرتك…", "التحقق من حزمة الأدلة…", "إعداد السؤال الأول…"],
};

const resumeSteps = {
  en: ["Reconnecting to your session…", "Reloading where you left off…"],
  ar: ["إعادة الاتصال بجلستك…", "إعادة تحميل ما توقفت عنده…"],
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function IdeaOverviewClient({
  idea,
  assessment,
  pendingInterrupt,
  currentUser,
}: {
  idea: Idea;
  assessment: IdeaAssessment | null;
  pendingInterrupt: IdeaSessionInterrupt | null;
  currentUser: User;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const isOwner = idea.ownerId === currentUser.id;

  async function startSession() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/ideas/${idea.id}/session`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setStartError(body?.error === "Canvas incomplete" ? t(copy.incomplete, locale) : body?.error ?? t(copy.incomplete, locale));
        return;
      }
      router.refresh();
    } catch {
      setStartError(t(copy.networkError, locale));
    } finally {
      setStarting(false);
    }
  }

  const hasStarted = idea.currentAssessmentVersion > 0 || pendingInterrupt !== null || idea.stage !== "intake";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CanvasEditor idea={idea} readOnly={!isOwner} />
        <EvidencePanel ideaId={idea.id} evidence={idea.evidence} readOnly={!isOwner} />
      </div>

      <div className="space-y-4">
        {pendingInterrupt?.type === "clarify_question" ? (
          <ClarifySessionPanel key={pendingInterrupt.clarificationId} ideaId={idea.id} interrupt={pendingInterrupt} />
        ) : !hasStarted ? (
          <Card>
            <CardHeader>
              <CardTitle>{t(copy.startTitle, locale)}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-600">{t(copy.startBody, locale)}</p>
              {isOwner && (
                <>
                  <Button onClick={startSession} disabled={starting || !checkCanvasCompleteness(idea.canvas, idea.team).complete}>
                    {starting && <Spinner />}
                    {starting ? t(copy.working, locale) : t(copy.start, locale)}
                  </Button>
                  {starting && (
                    <p className="text-sm text-ink-500">
                      <CyclingStatus messages={startSteps[locale]} /> {t(copy.workingNote, locale)}
                    </p>
                  )}
                  {startError && <p className="text-sm text-verdict-refine">{startError}</p>}
                </>
              )}
            </CardBody>
          </Card>
        ) : assessment ? (
          <>
            <ScorecardSummary
              assessment={assessment}
              readOnly={!isOwner}
              onRequestReassessment={isOwner ? startSession : undefined}
              reassessing={starting}
            />
            <Card>
              <CardBody className="flex justify-center">
                <RadarChart
                  axes={assessment.dimensions
                    .filter((d) => d.name in ideaDimensionLabels)
                    .map((d) => ({ label: label(ideaDimensionLabels[d.name], locale), value: d.rating }))}
                />
              </CardBody>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t(copy.lostTitle, locale)}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-600">{t(copy.lostBody, locale)}</p>
              {isOwner && (
                <>
                  <Button onClick={startSession} disabled={starting}>
                    {starting && <Spinner />}
                    {starting ? t(copy.working, locale) : t(copy.resume, locale)}
                  </Button>
                  {starting && (
                    <p className="text-sm text-ink-500">
                      <CyclingStatus messages={resumeSteps[locale]} /> {t(copy.workingNote, locale)}
                    </p>
                  )}
                  {startError && <p className="text-sm text-verdict-refine">{startError}</p>}
                </>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
