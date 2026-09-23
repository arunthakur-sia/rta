"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { CyclingStatus } from "@/components/ui/CyclingStatus";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { Markdown } from "@/components/ui/Markdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { demoDayDefaultFormat, juryPersonas } from "@/lib/skills/pitchRubric";
import type { MockJuryInterruptPayload } from "@/lib/agents/pitch-validation/nodes";
import type { MockJuryTurn } from "@/lib/types/domain";

const copy = {
  pending: { en: "Mock jury", ar: "لجنة تحكيم تجريبية" },
  timeLeft: { en: "Time left", ar: "الوقت المتبقي" },
  placeholder: { en: "Answer as if you were on stage…", ar: "أجب كما لو كنت على المسرح…" },
  submit: { en: "Submit answer", ar: "إرسال الإجابة" },
  log: { en: "Session log", ar: "سجل الجلسة" },
  questionLabel: { en: "Question", ar: "السؤال" },
  answerLabel: { en: "Your answer", ar: "إجابتك" },
  evaluationLabel: { en: "Jury feedback", ar: "ملاحظات لجنة التحكيم" },
  agentSuggestionLabel: { en: "Agent suggestion", ar: "اقتراح الوكيل" },
  answerError: { en: "Couldn't submit your answer. Try again.", ar: "تعذر إرسال إجابتك. حاول مرة أخرى." },
};

const evaluatingSteps = {
  en: ["Reading your answer…", "Checking it against the evidence…", "Weighing how the jury would react…", "Scoring qa_resilience…"],
  ar: ["قراءة إجابتك…", "مقارنتها بالأدلة المتاحة…", "تقدير كيف ستتفاعل لجنة التحكيم…", "تقييم مدى الصمود أمام الأسئلة…"],
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

// A dedicated, remount-per-question component: keying it by turnId (below)
// makes a new question reset the countdown for free, so the effect only
// ever needs to set up/tear down the interval — never call setState
// synchronously from the effect body itself.
function CountdownTimer({ locale }: { locale: "en" | "ar" }) {
  const [secondsLeft, setSecondsLeft] = useState(demoDayDefaultFormat.questionTimeSeconds);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-xs text-ink-500">
      {t(copy.timeLeft, locale)}: {secondsLeft}s
    </p>
  );
}

export function MockJuryPanel({ pitchId, interrupt, log }: { pitchId: string; interrupt: MockJuryInterruptPayload | null; log: MockJuryTurn[] }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit() {
    if (!answer.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/pitches/${pitchId}/mock-jury/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        setSubmitting(false);
        setSubmitError(t(copy.answerError, locale));
        return;
      }
      setAnswer("");
      router.refresh();
      // Left `submitting` true on success: this panel is keyed on turnId by
      // the parent, so it will be discarded once the refreshed props land
      // (either the next question's interrupt, or the mock-jury page's own
      // stalled-session fallback) rather than flipping back to the answer
      // form for the moment in between.
    } catch {
      setSubmitting(false);
      setSubmitError(t(copy.answerError, locale));
    }
  }

  return (
    <div className="space-y-4">
      {interrupt && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t(copy.pending, locale)} — {interrupt.personaName}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <ProgressBar value={interrupt.turnNumber} max={interrupt.totalTurns} label={`${interrupt.turnNumber}/${interrupt.totalTurns}`} />
            <Markdown className="text-base font-medium text-ink-900">{interrupt.question}</Markdown>
            <CountdownTimer key={interrupt.turnId} locale={locale} />
            {submitting ? (
              <div className="space-y-2 rounded-lg bg-accent-100 px-3 py-3 text-sm text-accent-700">
                <div className="flex items-center gap-2">
                  <Spinner className="shrink-0" />
                  <CyclingStatus messages={evaluatingSteps[locale]} className="font-medium" />
                </div>
                <LoadingBar />
              </div>
            ) : (
              <>
                <textarea rows={4} autoFocus className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t(copy.placeholder, locale)} />
                <Button onClick={submit} disabled={!answer.trim()}>
                  {t(copy.submit, locale)}
                </Button>
                {submitError && <p className="text-sm text-verdict-refine">{submitError}</p>}
              </>
            )}
          </CardBody>
        </Card>
      )}

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t(copy.log, locale)}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {log.map((turn) => {
              const persona = juryPersonas.find((p) => p.id === turn.personaId);
              return (
                <div key={turn.id} className="space-y-3 rounded-lg border border-border p-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge>{t(copy.questionLabel, locale)}</Badge>
                      {persona && <span className="text-xs text-ink-400">{persona.name}</span>}
                    </div>
                    <Markdown className="font-medium text-ink-900">{turn.question}</Markdown>
                  </div>

                  {turn.answer && (
                    <div className="space-y-1">
                      <Badge>{t(copy.answerLabel, locale)}</Badge>
                      <p className="text-ink-700">{turn.answer}</p>
                    </div>
                  )}

                  {turn.evaluation && (
                    <div className="space-y-1 rounded-md bg-muted p-3">
                      <Badge>{t(copy.evaluationLabel, locale)}</Badge>
                      <Markdown className="text-xs text-ink-600">{turn.evaluation}</Markdown>
                    </div>
                  )}

                  {turn.modelAnswer && (
                    <div className="space-y-1 rounded-md bg-accent-100 p-3">
                      <Badge tone="accent">{t(copy.agentSuggestionLabel, locale)}</Badge>
                      <Markdown className="text-xs text-accent-700">{turn.modelAnswer}</Markdown>
                    </div>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
