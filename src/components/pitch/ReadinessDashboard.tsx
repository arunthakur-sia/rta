"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PitchVerdictBadge } from "@/components/ui/Badge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { DimensionBars } from "@/components/ui/DimensionBars";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { pitchDimensionLabels, pitchVerdictLabels, label } from "@/lib/skills/glossary";
import { pitchVerdictThresholds } from "@/lib/skills/pitchRubric";
import type { PitchRun, ScoredPitchRun } from "@/lib/types/domain";

const copy = {
  score: { en: "Readiness score", ar: "درجة الجاهزية" },
  dims: { en: "Dimensions", ar: "الأبعاد" },
  actions: { en: "Prioritised actions", ar: "الإجراءات ذات الأولوية" },
  trend: { en: "Version trend", ar: "اتجاه النسخ" },
  hardRule: { en: "Rule applied", ar: "القاعدة المطبقة" },
  rework: { en: "Rework", ar: "إعادة عمل" },
  rehearse: { en: "Rehearse", ar: "بروفة" },
  ready: { en: "Ready", ar: "جاهز" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function ReadinessDashboard({ run, allRuns }: { run: ScoredPitchRun; allRuns: PitchRun[] }) {
  const { locale } = useLocale();
  const [done, setDone] = useState<Set<number>>(new Set());

  const zones = [
    { from: 1, to: pitchVerdictThresholds.rework.max, color: "var(--color-verdict-pivot-bg)", label: t(copy.rework, locale) },
    { from: pitchVerdictThresholds.rehearse.min, to: pitchVerdictThresholds.rehearse.max, color: "var(--color-verdict-refine-bg)", label: t(copy.rehearse, locale) },
    { from: pitchVerdictThresholds.readyForDemoDay.min, to: 5, color: "var(--color-verdict-ready-bg)", label: t(copy.ready, locale) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <PitchVerdictBadge verdict={run.verdict} label={label(pitchVerdictLabels[run.verdict], locale)} />
            <span className="text-sm text-ink-500">
              {t(copy.score, locale)}: <strong className="text-ink-900">{run.readinessScore.toFixed(2)}</strong>/5
            </span>
          </div>
          <ScoreGauge score={run.readinessScore} zones={zones} />
          {run.hardRuleTriggered && (
            <p className="text-xs text-ink-500">
              {t(copy.hardRule, locale)}: {run.hardRuleTriggered.replaceAll("_", " ")}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(copy.dims, locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <DimensionBars rows={run.dimensions.map((d) => ({ label: label(pitchDimensionLabels[d.name], locale), value: d.rating }))} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(copy.actions, locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {run.actions.map((a) => (
            <label key={a.priority} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={done.has(a.priority)}
                onChange={(e) =>
                  setDone((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(a.priority);
                    else next.delete(a.priority);
                    return next;
                  })
                }
              />
              <span className={done.has(a.priority) ? "text-ink-400 line-through" : "text-ink-800"}>{a.text}</span>
            </label>
          ))}
        </CardBody>
      </Card>

      {allRuns.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t(copy.trend, locale)}</CardTitle>
          </CardHeader>
          <CardBody className="flex gap-4 text-sm">
            {allRuns.map((r) => (
              <span key={r.version} className={r.version === run.version ? "font-semibold text-ink-900" : "text-ink-500"}>
                v{r.version}: {r.readinessScore !== null ? r.readinessScore.toFixed(2) : "…"}
              </span>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
