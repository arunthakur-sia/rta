"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IdeaCanvas, TeamProfile, WhatMustChange } from "@/lib/types/domain";
import type { IdeaCanvasAutofillOutput } from "@/lib/schemas/idea";

const copy = {
  title: { en: "New idea", ar: "فكرة جديدة" },
  ideaTitle: { en: "Idea name", ar: "اسم الفكرة" },
  autofillLabel: { en: "Autofill from a document (.docx, .pptx, .pdf, or an image)", ar: "تعبئة تلقائية من مستند (.docx أو .pptx أو .pdf أو صورة)" },
  autofillButton: { en: "Autofill from document", ar: "تعبئة تلقائية من المستند" },
  autofilling: { en: "Reading document…", ar: "جارٍ قراءة المستند…" },
  autofillError: { en: "Couldn't read that file. You can still fill the form by hand.", ar: "تعذر قراءة الملف. يمكنك تعبئة النموذج يدويًا." },
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
  teamSize: { en: "Team size", ar: "حجم الفريق" },
  hours: { en: "Hours/week available", ar: "الساعات المتاحة أسبوعيًا" },
  create: { en: "Create idea", ar: "إنشاء الفكرة" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

function emptyCanvas(): IdeaCanvas {
  return {
    tableTheme: "",
    prioritisedChallenge: "",
    howItWorks: "",
    whyItImprovesAdoption: "",
    currentExperience: "",
    proposedExperience: "",
    whatMustChange: { customerCommunication: "", processOrServiceRules: "", digitalCapability: "", operationsAndEcosystem: "" },
    assumptionsRisksDependencies: "",
    expectedImpact: null,
    implementationFeasibility: null,
  };
}

export function NewIdeaForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [canvas, setCanvas] = useState<IdeaCanvas>(emptyCanvas());
  const [team, setTeam] = useState<TeamProfile>({ size: 1, skills: [], hoursPerWeek: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, canvas, team }),
    });
    const data = (await res.json()) as { idea: { id: string } };
    router.push(`/workspace/${data.idea.id}`);
  }

  async function autofillFromFile(file: File) {
    setAutofilling(true);
    setAutofillError(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch("/api/ideas/autofill", { method: "POST", body: formData });
      if (!res.ok) {
        setAutofillError(t(copy.autofillError, locale));
        return;
      }
      const { result } = (await res.json()) as { result: IdeaCanvasAutofillOutput };
      if (result.ideaTitle) setTitle((prev) => prev || result.ideaTitle!);
      setCanvas((c) => mergeAutofill(c, result));
    } catch {
      setAutofillError(t(copy.autofillError, locale));
    } finally {
      setAutofilling(false);
    }
  }

  function textField(key: keyof IdeaCanvas, label: { en: string; ar: string }, rows = 2) {
    return (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-ink-700">{t(label, locale)}</label>
        <textarea
          rows={rows}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={canvas[key] as string}
          onChange={(e) => setCanvas((c) => ({ ...c, [key]: e.target.value }))}
        />
      </div>
    );
  }

  function whatMustChangeField(key: keyof WhatMustChange, label: { en: string; ar: string }) {
    return (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium text-ink-700">{t(label, locale)}</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
        <label className="mb-1 block text-sm font-medium text-ink-700">{t(label, locale)}</label>
        <input
          type="number"
          min={0}
          max={5}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={canvas[key] ?? ""}
          onChange={(e) => setCanvas((c) => ({ ...c, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(copy.title, locale)}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <label className="mb-2 block text-sm font-medium text-ink-700">{t(copy.autofillLabel, locale)}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pptx,.pdf,image/png,image/jpeg,image/webp"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void autofillFromFile(file);
              }}
            />
            {autofilling && <span className="text-sm text-ink-500">{t(copy.autofilling, locale)}</span>}
          </div>
          {autofillError && <p className="mt-2 text-sm text-verdict-refine">{autofillError}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t(copy.ideaTitle, locale)}</label>
          <input className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {textField("tableTheme", copy.tableTheme, 1)}
          {textField("prioritisedChallenge", copy.prioritisedChallenge, 1)}
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

        <div className="border-t border-border pt-4">{textField("assumptionsRisksDependencies", copy.assumptionsRisksDependencies)}</div>

        <div className="border-t border-border pt-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-800">{t(copy.assessmentSection, locale)}</h4>
          <div className="grid grid-cols-2 gap-3">
            {scoreField("expectedImpact", copy.expectedImpact)}
            {scoreField("implementationFeasibility", copy.implementationFeasibility)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{t(copy.teamSize, locale)}</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={team.size}
              onChange={(e) => setTeam((tm) => ({ ...tm, size: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{t(copy.hours, locale)}</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={team.hoursPerWeek}
              onChange={(e) => setTeam((tm) => ({ ...tm, hoursPerWeek: Number(e.target.value) }))}
            />
          </div>
        </div>
        <Button onClick={submit} disabled={submitting || !title.trim()}>
          {t(copy.create, locale)}
        </Button>
      </CardBody>
    </Card>
  );
}

function mergeAutofill(canvas: IdeaCanvas, result: IdeaCanvasAutofillOutput): IdeaCanvas {
  const merged: IdeaCanvas = { ...canvas, whatMustChange: { ...canvas.whatMustChange } };
  if (result.tableTheme) merged.tableTheme = result.tableTheme;
  if (result.prioritisedChallenge) merged.prioritisedChallenge = result.prioritisedChallenge;
  if (result.howItWorks) merged.howItWorks = result.howItWorks;
  if (result.whyItImprovesAdoption) merged.whyItImprovesAdoption = result.whyItImprovesAdoption;
  if (result.currentExperience) merged.currentExperience = result.currentExperience;
  if (result.proposedExperience) merged.proposedExperience = result.proposedExperience;
  if (result.assumptionsRisksDependencies) merged.assumptionsRisksDependencies = result.assumptionsRisksDependencies;
  if (result.expectedImpact !== null) merged.expectedImpact = result.expectedImpact;
  if (result.implementationFeasibility !== null) merged.implementationFeasibility = result.implementationFeasibility;
  if (result.whatMustChange.customerCommunication) merged.whatMustChange.customerCommunication = result.whatMustChange.customerCommunication;
  if (result.whatMustChange.processOrServiceRules) merged.whatMustChange.processOrServiceRules = result.whatMustChange.processOrServiceRules;
  if (result.whatMustChange.digitalCapability) merged.whatMustChange.digitalCapability = result.whatMustChange.digitalCapability;
  if (result.whatMustChange.operationsAndEcosystem) merged.whatMustChange.operationsAndEcosystem = result.whatMustChange.operationsAndEcosystem;
  return merged;
}
