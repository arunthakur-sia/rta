"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { Markdown } from "@/components/ui/Markdown";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { priorityLabels, label } from "@/lib/skills/glossary";
import { cn } from "@/lib/utils";
import type { Slide, SlideComment } from "@/lib/types/domain";

const copy = {
  noComments: { en: "No comments on this slide.", ar: "لا توجد تعليقات على هذه الشريحة." },
  rewrite: { en: "Suggested rewrite", ar: "إعادة صياغة مقترحة" },
  highOnly: { en: "High priority only", ar: "الأولوية العالية فقط" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function PitchStudioView({ slides, comments }: { slides: Slide[]; comments: SlideComment[] }) {
  const { locale } = useLocale();
  const [selected, setSelected] = useState(0);
  const [highOnly, setHighOnly] = useState(false);

  const priorityDot = (slideIndex: number) => {
    const slideComments = comments.filter((c) => c.slide === slideIndex);
    if (slideComments.some((c) => c.priority === "high")) return "bg-verdict-pivot";
    if (slideComments.some((c) => c.priority === "medium")) return "bg-verdict-refine";
    return "bg-transparent";
  };

  const slide = slides[selected];
  const slideComments = comments.filter((c) => c.slide === selected && (!highOnly || c.priority === "high"));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_320px]">
      <div className="space-y-1">
        {slides.map((s) => (
          <button
            key={s.index}
            onClick={() => setSelected(s.index)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-start text-xs",
              selected === s.index ? "border-accent-500 bg-accent-100" : "border-border hover:bg-muted"
            )}
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot(s.index))} />
            <span className="truncate">
              {s.index + 1}. {s.title || "—"}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {slide ? (
            <div>
              <h3 className="mb-2 text-lg font-semibold text-ink-900">{slide.title || "—"}</h3>
              <p className="whitespace-pre-wrap text-sm text-ink-700">{slide.body}</p>
              {slide.notes && (
                <p className="mt-3 rounded-lg bg-muted p-2 text-xs text-ink-500">{slide.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-500">—</p>
          )}
        </CardBody>
      </Card>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={highOnly} onChange={(e) => setHighOnly(e.target.checked)} />
          {t(copy.highOnly, locale)}
        </label>
        {slideComments.length === 0 ? (
          <p className="text-sm text-ink-500">{t(copy.noComments, locale)}</p>
        ) : (
          slideComments.map((c, i) => (
            <Card key={i}>
              <CardBody className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-ink-400">{c.element}</span>
                  <PriorityBadge priority={c.priority} label={label(priorityLabels[c.priority], locale)} />
                </div>
                <p className="italic text-ink-600">&ldquo;{c.quote}&rdquo;</p>
                <Markdown className="text-ink-800">{c.issue}</Markdown>
                <div className="text-xs text-ink-500">
                  <span className="font-medium">{t(copy.rewrite, locale)}:</span>
                  <Markdown className="text-xs text-ink-500">{c.rewrite}</Markdown>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
