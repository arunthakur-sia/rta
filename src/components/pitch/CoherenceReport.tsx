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
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function CoherenceReport({ rows }: { rows: CoherenceRow[] }) {
  const { locale } = useLocale();

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-500">{t(copy.empty, locale)}</CardBody>
      </Card>
    );
  }

  return (
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
  );
}
