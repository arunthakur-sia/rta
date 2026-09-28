"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Markdown } from "@/components/ui/Markdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { coherenceStatusLabels, label } from "@/lib/skills/glossary";
import type { CoherenceRow } from "@/lib/types/domain";

const statusTone: Record<CoherenceRow["status"], "good" | "warn" | "bad" | "neutral"> = {
  supported: "good",
  changed: "warn",
  overstated: "bad",
  unsupported: "bad",
};

const copy = {
  slide: { en: "Slide", ar: "شريحة" },
  claim: { en: "Claim in the deck", ar: "الادعاء في العرض" },
  evidence: { en: "Evidence in the record", ar: "الدليل في السجل" },
  empty: { en: "No claims flagged.", ar: "لا توجد ادعاءات مسجلة." },
  legendTitle: { en: "What each status means", ar: "معنى كل حالة" },
};

const statusDescriptions: Record<CoherenceRow["status"], { en: string; ar: string }> = {
  supported: {
    en: "Matches the record presented in the Idea section.",
    ar: "يتطابق مع السجل المعروض في قسم الفكرة.",
  },
  changed: {
    en: "The number is different from the record presented in the Idea section, and the deck doesn't say why.",
    ar: "الرقم مختلف عن السجل المعروض في قسم الفكرة، والعرض لا يوضح السبب.",
  },
  overstated: {
    en: "Stronger than what the record presented in the Idea section actually supports.",
    ar: "أقوى مما يدعمه السجل المعروض في قسم الفكرة فعليًا.",
  },
  unsupported: {
    en: "No basis for this claim in the record presented in the Idea section.",
    ar: "لا يوجد أساس لهذا الادعاء في السجل المعروض في قسم الفكرة.",
  },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

function StatusLegend({ locale }: { locale: "en" | "ar" }) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{t(copy.legendTitle, locale)}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(Object.keys(statusDescriptions) as CoherenceRow["status"][]).map((status) => (
            <div key={status} className="flex items-start gap-2 sm:w-[calc(50%-0.5rem)]">
              <Badge tone={statusTone[status]}>{label(coherenceStatusLabels[status], locale)}</Badge>
              <span className="text-xs text-ink-600">{t(statusDescriptions[status], locale)}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function CoherenceReport({ rows }: { rows: CoherenceRow[] }) {
  const { locale } = useLocale();

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <StatusLegend locale={locale} />
        <Card>
          <CardBody className="text-sm text-ink-500">{t(copy.empty, locale)}</CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatusLegend locale={locale} />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs uppercase text-ink-500">
              <th className="p-2 text-start">{t(copy.slide, locale)}</th>
              <th className="p-2 text-start">{t(copy.claim, locale)}</th>
              <th className="p-2 text-start">{t(copy.evidence, locale)}</th>
              <th className="p-2 text-start">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="p-2 font-medium text-ink-800">{row.slide + 1}</td>
                <td className="p-2 text-ink-700">
                  <Markdown>{row.claim}</Markdown>
                </td>
                <td className="p-2 text-ink-600">{row.recordRef}</td>
                <td className="p-2">
                  <Badge tone={statusTone[row.status]}>{label(coherenceStatusLabels[row.status], locale)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
