// Fixed bilingual glossary — a "skill" in the sense used throughout the plan:
// loaded by both the agent prompts and the interface so rubric dimension
// names, verdict categories, prototype types and template sections read
// identically everywhere. Do not translate these ad hoc elsewhere.

import type {
  IdeaDimensionName,
  IdeaVerdict,
  PitchDimensionName,
  PitchVerdict,
  PitchTemplateSection,
} from "@/lib/types/domain";

export interface Bilingual {
  en: string;
  ar: string;
}

export const ideaDimensionLabels: Record<IdeaDimensionName, Bilingual> = {
  problem_clarity: { en: "Problem clarity", ar: "وضوح المشكلة" },
  user_evidence: { en: "User evidence", ar: "أدلة المستخدمين" },
  value_viability: { en: "Value and viability", ar: "القيمة وقابلية التطبيق" },
  feasibility: { en: "Feasibility", ar: "الجدوى" },
  novelty_risk: { en: "Novelty and risk awareness", ar: "التميّز والوعي بالمخاطر" },
};

export const ideaVerdictLabels: Record<IdeaVerdict, Bilingual> = {
  ready_to_prototype: { en: "Ready to prototype", ar: "جاهزة للنموذج الأولي" },
  refine_and_resubmit: { en: "Refine and resubmit", ar: "تحتاج تطويرًا وإعادة تقديم" },
  pivot: { en: "Pivot", ar: "تغيير الاتجاه" },
};

export const pitchDimensionLabels: Record<PitchDimensionName, Bilingual> = {
  narrative_clarity: { en: "Narrative clarity", ar: "وضوح السرد" },
  evidence_traction: { en: "Evidence and traction", ar: "الأدلة ومؤشرات التقدم" },
  value_to_rta: { en: "Value to RTA", ar: "القيمة لهيئة الطرق والنقل" },
  plan_and_ask: { en: "Plan and ask", ar: "الخطة والطلب" },
  delivery_timing: { en: "Delivery and timing", ar: "الإلقاء والتوقيت" },
  visual_clarity: { en: "Visual clarity", ar: "الوضوح البصري" },
  qa_resilience: { en: "Q&A resilience", ar: "التعامل مع الأسئلة" },
};

export const pitchVerdictLabels: Record<PitchVerdict, Bilingual> = {
  ready_for_demo_day: { en: "Ready for Demo Day", ar: "جاهز ليوم العرض" },
  rehearse: { en: "Rehearse", ar: "بحاجة إلى بروفة" },
  rework: { en: "Rework", ar: "بحاجة إلى إعادة عمل" },
};

export const prototypeRungLabels: Record<1 | 2 | 3 | 4 | 5, Bilingual> = {
  1: { en: "Storyboard or one-page concept", ar: "لوحة قصصية أو مفهوم من صفحة واحدة" },
  2: { en: "Clickable mockup of the core flow", ar: "نموذج تفاعلي قابل للنقر" },
  3: { en: "No-code working prototype", ar: "نموذج أولي عملي بدون برمجة" },
  4: { en: "AI-assisted demo", ar: "عرض توضيحي بمساعدة الذكاء الاصطناعي" },
  5: { en: "Concierge or manual pilot", ar: "تجربة استرشادية يدوية" },
};

export const templateSectionLabels: Record<PitchTemplateSection, Bilingual> = {
  problem: { en: "Problem", ar: "المشكلة" },
  users: { en: "Who is affected", ar: "المتأثرون" },
  validation: { en: "What was validated", ar: "ما تم التحقق منه" },
  prototype: { en: "The prototype and what it proved", ar: "النموذج الأولي وما أثبته" },
  value: { en: "Value to RTA", ar: "القيمة لهيئة الطرق والنقل" },
  ask: { en: "What is needed next", ar: "الخطوات التالية المطلوبة" },
  team: { en: "Team", ar: "الفريق" },
  other: { en: "Other", ar: "أخرى" },
};

export const confidenceLabels: Record<"high" | "medium" | "low", Bilingual> = {
  high: { en: "High", ar: "عالية" },
  medium: { en: "Medium", ar: "متوسطة" },
  low: { en: "Low", ar: "منخفضة" },
};

export const priorityLabels: Record<"high" | "medium" | "low", Bilingual> = {
  high: { en: "High", ar: "عالية" },
  medium: { en: "Medium", ar: "متوسطة" },
  low: { en: "Low", ar: "منخفضة" },
};

export const coherenceStatusLabels: Record<
  "supported" | "overstated" | "changed" | "unsupported",
  Bilingual
> = {
  supported: { en: "Supported", ar: "مدعوم" },
  overstated: { en: "Overstated", ar: "مبالغ فيه" },
  changed: { en: "Changed", ar: "تغيّر بدون تفسير" },
  unsupported: { en: "Unsupported", ar: "غير مدعوم" },
};

export const programPhaseLabels: Bilingual[] = [
  { en: "Idea generation", ar: "توليد الأفكار" },
  { en: "Idea validation", ar: "التحقق من الفكرة" },
  { en: "Idea Validation Agent", ar: "عامل التحقق من الفكرة" },
  { en: "Prototype building", ar: "بناء النموذج الأولي" },
  { en: "Pitch readiness", ar: "الاستعداد للعرض" },
  { en: "Pitch Validation Agent", ar: "عامل التحقق من العرض" },
  { en: "Demo Day", ar: "يوم العرض" },
];

export function label(entry: Bilingual, locale: "en" | "ar"): string {
  return locale === "ar" ? entry.ar : entry.en;
}
