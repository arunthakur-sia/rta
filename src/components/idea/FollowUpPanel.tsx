"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { FollowUpCheckInOutput } from "@/lib/schemas/idea";

const copy = {
  title: { en: "Weekly check-in (follow-up mode)", ar: "المتابعة الأسبوعية" },
  placeholder: { en: "How is the prototype test going this week?", ar: "كيف يسير اختبار النموذج الأولي هذا الأسبوع؟" },
  submit: { en: "Send update", ar: "إرسال التحديث" },
  changed: { en: "Riskiest assumption changed", ar: "تغيّر أخطر افتراض" },
  recommendation: { en: "Recommendation", ar: "التوصية" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function FollowUpPanel({ ideaId }: { ideaId: string }) {
  const { locale } = useLocale();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FollowUpCheckInOutput | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/ideas/${ideaId}/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateText: text }),
    });
    const data = (await res.json()) as { result: FollowUpCheckInOutput };
    setResult(data.result);
    setText("");
    setSubmitting(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(copy.title, locale)}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder={t(copy.placeholder, locale)}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button variant="secondary" size="sm" onClick={submit} disabled={submitting || !text.trim()}>
          {t(copy.submit, locale)}
        </Button>
        {result && (
          <div className="space-y-2 rounded-lg bg-muted p-3 text-sm text-ink-700">
            <Markdown>{result.progressAssessment}</Markdown>
            {result.riskiestAssumptionChanged && (
              <div className="text-accent-700">
                <p className="font-medium">{t(copy.changed, locale)}:</p>
                <Markdown className="text-accent-700">{result.updatedRiskiestAssumption ?? ""}</Markdown>
              </div>
            )}
            <div>
              <p className="font-medium">{t(copy.recommendation, locale)}:</p>
              <Markdown>{result.recommendation}</Markdown>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
