"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CANVAS_MIN_FIELD_LENGTH, checkCanvasCompleteness } from "@/lib/validation/ideaCanvas";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Idea, IdeaCanvas, TeamProfile, WhatMustChange } from "@/lib/types/domain";

const copy = {
  canvas: { en: "Idea canvas", ar: "لوحة الفكرة" },
  tableTheme: { en: "Table / Theme", ar: "الطاولة / الموضوع" },
  prioritisedChallenge: { en: "Prioritised challenge", ar: "التحدي ذو الأولوية" },
  interventionSection: { en: "The proposed intervention", ar: "التدخل المقترح" },
  howItWorks: { en: "How it works", ar: "كيف تعمل" },
  whyItImprovesAdoption: { en: "Why it should improve adoption", ar: "لماذا يجب أن تحسّن التبني" },
  experienceSection: { en: "How the experience changes", ar: "كيف تتغير التجربة" },
  currentExperience: { en: "Today", ar: "اليوم" },
  proposedExperience: { en: "Proposed experience", ar: "التجربة المقترحة" },
  whatMustChangeSection: { en: "What must change", ar: "ما الذي يجب أن يتغير" },
  customerCommunication: { en: "Customer communication", ar: "التواصل مع العملاء" },
  processOrServiceRules: { en: "Process or service rules", ar: "العملية أو قواعد الخدمة" },
  digitalCapability: { en: "Digital capability", ar: "القدرة الرقمية" },
  operationsAndEcosystem: { en: "Operations and ecosystem", ar: "العمليات والنظام المرتبط" },
  assumptionsRisksDependencies: { en: "Key assumptions, risks and dependencies", ar: "الافتراضات الرئيسية والمخاطر والتبعيات" },
  assessmentSection: { en: "Table assessment", ar: "تقييم الطاولة" },
  expectedImpact: { en: "Expected impact (0-5)", ar: "الأثر المتوقع (0-5)" },
  implementationFeasibility: { en: "Implementation feasibility (0-5)", ar: "جدوى التنفيذ (0-5)" },
  team: { en: "Team profile", ar: "ملف الفريق" },
  size: { en: "Team size", ar: "حجم الفريق" },
  skills: { en: "Skills (comma separated)", ar: "المهارات (مفصولة بفواصل)" },
  hours: { en: "Hours/week available", ar: "الساعات المتاحة أسبوعيًا" },
  save: { en: "Save canvas", ar: "حفظ اللوحة" },
  saved: { en: "Saved", ar: "تم الحفظ" },
  minLength: { en: `Needs at least ${CANVAS_MIN_FIELD_LENGTH} characters`, ar: `يتطلب ${CANVAS_MIN_FIELD_LENGTH} حرفًا على الأقل` },
  required: { en: "Required", ar: "مطلوب" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function CanvasEditor({ idea, readOnly }: { idea: Idea; readOnly: boolean }) {
  const { locale } = useLocale();
  const [canvas, setCanvas] = useState<IdeaCanvas>(idea.canvas);
  const [team, setTeam] = useState<TeamProfile>(idea.team);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const completeness = checkCanvasCompleteness(canvas, team);

  async function save() {
    setSaving(true);
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvas, team }),
    });
    setSaving(false);
    setSavedAt(Date.now());
  }

  function textField(key: keyof IdeaCanvas, label: { en: string; ar: string }, opts?: { short?: boolean }) {
    const missing = completeness.missingFields.includes(key);
    const value = canvas[key];
    return (
      <div key={key}>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-ink-700">{t(label, locale)}</label>
          {typeof value === "string" && (
            <span className={missing ? "text-xs text-verdict-refine" : "text-xs text-verdict-ready"}>
              {missing ? t(opts?.short ? copy.required : copy.minLength, locale) : "✓"}
            </span>
          )}
        </div>
        <textarea
          disabled={readOnly}
          rows={opts?.short ? 1 : 2}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
          value={value as string}
          onChange={(e) => setCanvas((c) => ({ ...c, [key]: e.target.value }))}
        />
      </div>
    );
  }

  function whatMustChangeField(key: keyof WhatMustChange, label: { en: string; ar: string }) {
    const missing = completeness.missingFields.includes(`whatMustChange.${key}`);
    return (
      <div key={key}>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-ink-700">{t(label, locale)}</label>
          <span className={missing ? "text-xs text-verdict-refine" : "text-xs text-verdict-ready"}>
            {missing ? t(copy.required, locale) : "✓"}
          </span>
        </div>
        <textarea
          disabled={readOnly}
          rows={2}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
          value={canvas.whatMustChange[key]}
          onChange={(e) =>
            setCanvas((c) => ({ ...c, whatMustChange: { ...c.whatMustChange, [key]: e.target.value } }))
          }
        />
      </div>
    );
  }

  function scoreField(key: "expectedImpact" | "implementationFeasibility", label: { en: string; ar: string }) {
    return (
      <div key={key}>
        <label className="mb-1 block text-xs text-ink-600">{t(label, locale)}</label>
        <input
          type="number"
          min={0}
          max={5}
          disabled={readOnly}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
          value={canvas[key] ?? ""}
          onChange={(e) => setCanvas((c) => ({ ...c, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{t(copy.canvas, locale)}</CardTitle>
        {savedAt && !saving && <span className="text-xs text-verdict-ready">{t(copy.saved, locale)}</span>}
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {textField("tableTheme", copy.tableTheme, { short: true })}
          {textField("prioritisedChallenge", copy.prioritisedChallenge, { short: true })}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.interventionSection, locale)}</h4>
          <div className="space-y-3">
            {textField("howItWorks", copy.howItWorks)}
            {textField("whyItImprovesAdoption", copy.whyItImprovesAdoption)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.experienceSection, locale)}</h4>
          <div className="space-y-3">
            {textField("currentExperience", copy.currentExperience)}
            {textField("proposedExperience", copy.proposedExperience)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.whatMustChangeSection, locale)}</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {whatMustChangeField("customerCommunication", copy.customerCommunication)}
            {whatMustChangeField("processOrServiceRules", copy.processOrServiceRules)}
            {whatMustChangeField("digitalCapability", copy.digitalCapability)}
            {whatMustChangeField("operationsAndEcosystem", copy.operationsAndEcosystem)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          {textField("assumptionsRisksDependencies", copy.assumptionsRisksDependencies)}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.assessmentSection, locale)}</h4>
          <div className="grid grid-cols-2 gap-3">
            {scoreField("expectedImpact", copy.expectedImpact)}
            {scoreField("implementationFeasibility", copy.implementationFeasibility)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.team, locale)}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink-600">{t(copy.size, locale)}</label>
              <input
                type="number"
                min={1}
                disabled={readOnly}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
                value={team.size}
                onChange={(e) => setTeam((tm) => ({ ...tm, size: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-600">{t(copy.hours, locale)}</label>
              <input
                type="number"
                min={0}
                disabled={readOnly}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
                value={team.hoursPerWeek}
                onChange={(e) => setTeam((tm) => ({ ...tm, hoursPerWeek: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-ink-600">{t(copy.skills, locale)}</label>
            <input
              disabled={readOnly}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:bg-muted"
              value={team.skills.join(", ")}
              onChange={(e) => setTeam((tm) => ({ ...tm, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            />
          </div>
        </div>

        {!readOnly && (
          <Button variant="secondary" onClick={save} disabled={saving}>
            {t(copy.save, locale)}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
