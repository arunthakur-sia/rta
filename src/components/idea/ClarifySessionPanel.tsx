"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { CyclingStatus } from "@/components/ui/CyclingStatus";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ideaDimensionLabels, label } from "@/lib/skills/glossary";
import type { ClarifyInterruptPayload } from "@/lib/agents/idea-validation/nodes";
import type { IdeaDimensionName } from "@/lib/types/domain";

const copy = {
  title: { en: "Validation session", ar: "جلسة التحقق" },
  why: { en: "Why we ask this", ar: "لماذا نسأل هذا" },
  placeholder: { en: "Type your answer…", ar: "اكتب إجابتك…" },
  submit: { en: "Submit answer", ar: "إرسال الإجابة" },
  submitting: { en: "Thinking…", ar: "جارٍ التفكير…" },
  progress: { en: "Question {n} of up to {max}", ar: "السؤال {n} من {max} كحد أقصى" },
  finishingNote: {
    en: "This can take up to a minute if that was the last question.",
    ar: "قد يستغرق ذلك حتى دقيقة إذا كان هذا آخر سؤال.",
  },
  answerError: { en: "Couldn't submit your answer. Try again.", ar: "تعذر إرسال إجابتك. حاول مرة أخرى." },
};

const finishingSteps = {
  en: [
    "Reading your answer…",
    "Checking rubric coverage…",
    "Scoring against the six dimensions…",
    "Running the quality critique…",
    "Computing the verdict…",
    "Drafting the prototype plan…",
  ],
  ar: [
    "قراءة إجابتك…",
    "التحقق من تغطية المعايير…",
    "التقييم مقابل الأبعاد الستة…",
    "تنفيذ مراجعة الجودة…",
    "احتساب القرار…",
    "إعداد خطة النموذج الأولي…",
  ],
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function ClarifySessionPanel({ ideaId, interrupt }: { ideaId: string; interrupt: ClarifyInterruptPayload }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(true);

  async function submit() {
    if (!answer.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/session/answer`, {
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
      // Left `submitting` true on success: this panel is keyed on
      // clarificationId (or unmounted entirely once the next stage isn't
      // another clarify question) by the parent, so it will be discarded
      // once the refreshed props land rather than flipping back to the
      // answer form for the moment in between.
    } catch {
      setSubmitting(false);
      setSubmitError(t(copy.answerError, locale));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(copy.title, locale)}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ProgressBar
          value={interrupt.askedCount}
          max={interrupt.maxQuestions}
          label={t(copy.progress, locale)
            .replace("{n}", String(interrupt.askedCount))
            .replace("{max}", String(interrupt.maxQuestions))}
        />

        {interrupt.dimension && interrupt.dimension in ideaDimensionLabels && (
          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-ink-600">
            {label(ideaDimensionLabels[interrupt.dimension as IdeaDimensionName], locale)}
          </span>
        )}

        <p className="text-base font-medium text-ink-900">{interrupt.question}</p>

        <button type="button" className="text-xs text-ink-500 underline" onClick={() => setShowWhy((s) => !s)}>
          {t(copy.why, locale)}
        </button>
        {showWhy && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink-600">{interrupt.whyWeAsk}</p>}

        {submitting ? (
          <div className="flex items-start gap-2 rounded-lg bg-accent-100 px-3 py-3 text-sm text-accent-700">
            <Spinner className="mt-0.5 shrink-0" />
            <div>
              <CyclingStatus messages={finishingSteps[locale]} className="font-medium" />
              <p className="mt-1 text-xs text-accent-700/80">{t(copy.finishingNote, locale)}</p>
            </div>
          </div>
        ) : (
          <>
            <textarea
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              placeholder={t(copy.placeholder, locale)}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Button onClick={submit} disabled={!answer.trim()}>
              {t(copy.submit, locale)}
            </Button>
            {submitError && <p className="text-sm text-verdict-refine">{submitError}</p>}
          </>
        )}
      </CardBody>
    </Card>
  );
}
