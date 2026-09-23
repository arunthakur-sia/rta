"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, IdeaVerdictBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { confidenceLabels, ideaDimensionLabels, ideaVerdictLabels, label } from "@/lib/skills/glossary";
import type { Idea, IdeaAssessment, IdeaCanvas } from "@/lib/types/domain";

const copy = {
  title: { en: "Scorecard", ar: "بطاقة التقييم" },
  score: { en: "Weighted score", ar: "الدرجة الموزونة" },
  confidence: { en: "Confidence", ar: "مستوى الثقة" },
  reasons: { en: "Top reasons", ar: "أهم الأسباب" },
  assumptions: { en: "Assumptions to verify", ar: "افتراضات تحتاج للتحقق" },
  noAssumptions: { en: "No unverified assumptions flagged.", ar: "لا توجد افتراضات غير مؤكدة." },
  anchor: { en: "Rubric anchor applied", ar: "المعيار المطبق" },
  evidence: { en: "Evidence quoted", ar: "الأدلة المقتبسة" },
  openQuestions: { en: "Open questions", ar: "أسئلة مفتوحة" },
  insufficient: { en: "Insufficient information", ar: "معلومات غير كافية" },
  respond: { en: "Respond", ar: "الرد" },
  respondPlaceholder: { en: "Add context or push back on this rating…", ar: "أضف سياقًا أو اعترض على هذا التقييم…" },
  send: { en: "Send", ar: "إرسال" },
  reassess: { en: "Add evidence above, then request re-assessment", ar: "أضف أدلة أعلاه، ثم اطلب إعادة التقييم" },
  requestReassessment: { en: "Request re-assessment", ar: "طلب إعادة التقييم" },
  reassessingLabel: { en: "Reassessing…", ar: "جارٍ إعادة التقييم…" },
  pivotReframings: { en: "Adjacent problem framings to consider", ar: "صياغات بديلة للمشكلة يمكن النظر فيها" },
  hardRule: { en: "Rule applied", ar: "القاعدة المطبقة" },
  sourceCanvas: { en: "Canvas", ar: "اللوحة" },
  sourceClarification: { en: "Interview", ar: "المقابلة" },
  sourceEvidence: { en: "Evidence pack", ar: "حزمة الأدلة" },
  sourceWeb: { en: "Web", ar: "الويب" },
  questionLabel: { en: "Question", ar: "السؤال" },
  answerLabel: { en: "Answer", ar: "الإجابة" },
  unanswered: { en: "(not yet answered)", ar: "(لم تتم الإجابة بعد)" },
  sourceNotFound: { en: "Original source not found — it may have been removed.", ar: "تعذر العثور على المصدر الأصلي — ربما تمت إزالته." },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

/** "howItWorks" / "customer_communication" → "how it works" / "customer communication". */
function prettifyFieldPath(detail: string): string {
  return detail
    .split(".")
    .map((part) =>
      part
        .replace(/_/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase()
    )
    .join(" › ");
}

/** Evidence is cited as raw "canvas.field" / "clarification.<id>" strings; render those as a readable pill instead of literal brackets. */
function formatEvidenceSource(source: string, locale: "en" | "ar"): string {
  const [kind, ...rest] = source.split(".");
  const detail = rest.join(".");
  switch (kind) {
    case "canvas":
      return detail ? `${t(copy.sourceCanvas, locale)} · ${prettifyFieldPath(detail)}` : t(copy.sourceCanvas, locale);
    case "clarification":
      return t(copy.sourceClarification, locale);
    case "evidence":
      return t(copy.sourceEvidence, locale);
    case "web":
      return t(copy.sourceWeb, locale);
    default:
      return source;
  }
}

/** Looks up a canvas field by dot-path first, then falls back to a case/underscore-insensitive match — the model's own citation string doesn't always match the field key exactly. */
function resolveCanvasValue(canvas: IdeaCanvas, detail: string): string | null {
  const parts = detail.split(".");
  let node: unknown = canvas;
  for (const part of parts) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === "string" && node) return node;

  const flat: Record<string, unknown> = { ...canvas, ...canvas.whatMustChange };
  const target = parts[parts.length - 1]?.toLowerCase().replace(/[_\s]/g, "");
  for (const [key, value] of Object.entries(flat)) {
    if (key.toLowerCase().replace(/[_\s]/g, "") === target && typeof value === "string" && value) {
      return value;
    }
  }
  return null;
}

/** Resolves an evidence citation ("clarification.<id>" / "evidence.<id>" / "canvas.field") back to the original text it quotes, so a participant can check the quote in context instead of just trusting it. Returns null for a citation with nothing to show ("web", or a stale id from before the record changed). */
function resolveEvidenceSource(
  source: string,
  idea: Pick<Idea, "clarifications" | "evidence" | "canvas">,
  locale: "en" | "ar"
): ReactNode | null {
  const [kind, ...rest] = source.split(".");
  const detail = rest.join(".");

  if (kind === "clarification") {
    const item = idea.clarifications.find((c) => c.id === detail);
    if (!item) return <p className="text-ink-400">{t(copy.sourceNotFound, locale)}</p>;
    return (
      <div className="space-y-1">
        <p>
          <span className="font-semibold text-ink-500">{t(copy.questionLabel, locale)}:</span> {item.question}
        </p>
        <p>
          <span className="font-semibold text-ink-500">{t(copy.answerLabel, locale)}:</span>{" "}
          {item.answer || t(copy.unanswered, locale)}
        </p>
      </div>
    );
  }

  if (kind === "evidence") {
    const item = idea.evidence.find((e) => e.id === detail);
    if (!item) return <p className="text-ink-400">{t(copy.sourceNotFound, locale)}</p>;
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-wrap">{item.content}</p>
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" className="text-accent-700 underline">
            {item.url}
          </a>
        )}
      </div>
    );
  }

  if (kind === "canvas") {
    const value = resolveCanvasValue(idea.canvas, detail);
    if (value === null) return <p className="text-ink-400">{t(copy.sourceNotFound, locale)}</p>;
    return <p className="whitespace-pre-wrap">{value}</p>;
  }

  return null;
}

function DimensionCard({
  idea,
  dim,
  locale,
}: {
  idea: Idea;
  dim: IdeaAssessment["dimensions"][number];
  locale: "en" | "ar";
}) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    await fetch(`/api/ideas/${idea.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "note", content: `[${label(ideaDimensionLabels[dim.name], locale)}] ${text.trim()}` }),
    });
    setText("");
    setSending(false);
    setResponding(false);
    router.refresh();
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>{label(ideaDimensionLabels[dim.name], locale)}</CardTitle>
        <Badge tone={dim.rating === null ? "neutral" : dim.rating >= 4 ? "good" : dim.rating >= 3 ? "warn" : "bad"}>
          {dim.rating === null ? t(copy.insufficient, locale) : `${dim.rating}/5`}
        </Badge>
      </CardHeader>
      <CardBody className="flex flex-1 flex-col text-sm">
        <div className="flex-1 space-y-3">
          <p className="text-ink-600 italic">&ldquo;{dim.anchor}&rdquo;</p>
          {dim.evidence.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-500">{t(copy.evidence, locale)}</p>
              <ul className="space-y-1.5">
                {dim.evidence.map((e, i) => {
                  const resolved = resolveEvidenceSource(e.source, idea, locale);
                  const isOpen = expandedIndex === i;
                  return (
                    <li key={i} className="rounded-lg bg-muted px-2.5 py-1.5 text-ink-700">
                      {resolved ? (
                        <button
                          type="button"
                          onClick={() => setExpandedIndex(isOpen ? null : i)}
                          aria-expanded={isOpen}
                          className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-500 ring-1 ring-inset ring-border transition-colors hover:bg-accent-50 hover:text-accent-700 hover:ring-accent-300"
                        >
                          {formatEvidenceSource(e.source, locale)}
                          <span aria-hidden>{isOpen ? "▲" : "▼"}</span>
                        </button>
                      ) : (
                        <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-ink-500 ring-1 ring-inset ring-border">
                          {formatEvidenceSource(e.source, locale)}
                        </span>
                      )}
                      <p>{e.quote}</p>
                      {resolved && isOpen && (
                        <div className="mt-2 rounded-lg border border-border bg-white p-2 text-xs text-ink-600">{resolved}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {dim.openQuestions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-500">{t(copy.openQuestions, locale)}</p>
              <ul className="list-disc ps-4 text-ink-700">
                {dim.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          {responding ? (
            <div className="space-y-2">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                placeholder={t(copy.respondPlaceholder, locale)}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={send} disabled={sending}>
                {t(copy.send, locale)}
              </Button>
            </div>
          ) : (
            <button type="button" className="text-xs font-medium text-accent-700 underline" onClick={() => setResponding(true)}>
              {t(copy.respond, locale)}
            </button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Verdict + weighted score + top reasons + the re-assessment trigger. Lives on the idea's overview page. */
export function ScorecardSummary({
  assessment,
  readOnly,
  onRequestReassessment,
  reassessing,
}: {
  assessment: IdeaAssessment;
  readOnly: boolean;
  onRequestReassessment?: () => void;
  reassessing?: boolean;
}) {
  const { locale } = useLocale();

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <IdeaVerdictBadge verdict={assessment.verdict} label={label(ideaVerdictLabels[assessment.verdict], locale)} />
            <span className="text-sm text-ink-500">
              {t(copy.score, locale)}: <strong className="text-ink-900">{assessment.weightedScore.toFixed(2)}</strong>/5
            </span>
            <Badge tone="neutral">
              {t(copy.confidence, locale)}: {label(confidenceLabels[assessment.confidence], locale)}
            </Badge>
          </div>
          <ul className="list-disc ps-5 text-sm text-ink-700">
            {assessment.topReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {assessment.hardRuleTriggered && (
            <p className="mt-2 text-xs text-ink-500">
              {t(copy.hardRule, locale)}: {assessment.hardRuleTriggered.replaceAll("_", " ")}
            </p>
          )}
        </div>
        {!readOnly && onRequestReassessment && (
          <Button variant="secondary" size="sm" onClick={onRequestReassessment} disabled={reassessing}>
            {reassessing && <Spinner />}
            {reassessing ? t(copy.reassessingLabel, locale) : t(copy.requestReassessment, locale)}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

/** The rubric-dimension cards ("5 pillars"). Lives on its own page since each card carries real detail. */
export function ScorecardDimensions({ idea, assessment }: { idea: Idea; assessment: IdeaAssessment }) {
  const { locale } = useLocale();

  // Filters out a dimension no longer in the current rubric (e.g. an
  // assessment scored before a pillar was retired) rather than crashing —
  // ideaDimensionLabels only has entries for the current dimension set.
  const dimensions = assessment.dimensions.filter((dim) => dim.name in ideaDimensionLabels);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {dimensions.map((dim) => (
        <DimensionCard key={dim.name} idea={idea} dim={dim} locale={locale} />
      ))}
    </div>
  );
}

/** Pivot reframings + assumptions to verify — secondary scorecard detail, grouped with the plan/review page. */
export function ScorecardExtras({ assessment }: { assessment: IdeaAssessment }) {
  const { locale } = useLocale();

  return (
    <div className="space-y-4">
      {assessment.verdict === "pivot" && assessment.pivotReframings && (
        <Card>
          <CardHeader>
            <CardTitle>{t(copy.pivotReframings, locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc ps-5 text-sm text-ink-700">
              {assessment.pivotReframings.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t(copy.assumptions, locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          {assessment.assumptionsToVerify.length === 0 ? (
            <p className="text-sm text-ink-500">{t(copy.noAssumptions, locale)}</p>
          ) : (
            <ul className="list-disc ps-5 text-sm text-ink-700">
              {assessment.assumptionsToVerify.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
