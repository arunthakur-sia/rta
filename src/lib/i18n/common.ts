import type { Locale } from "@/lib/types/domain";

export const common = {
  appName: { en: "RTA Innovation Program", ar: "برنامج الابتكار لهيئة الطرق والنقل" },
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  continueLabel: { en: "Continue", ar: "متابعة" },
  back: { en: "Back", ar: "رجوع" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  submit: { en: "Submit", ar: "إرسال" },
  export: { en: "Export", ar: "تصدير" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  language: { en: "Language", ar: "اللغة" },
  ideas: { en: "Ideas", ar: "الأفكار" },
  pitches: { en: "Pitches", ar: "العروض" },
  newIdea: { en: "New idea", ar: "فكرة جديدة" },
  dashboard: { en: "Dashboard", ar: "لوحة المعلومات" },
} as const;

export function t(entry: { en: string; ar: string }, locale: Locale): string {
  return locale === "ar" ? entry.ar : entry.en;
}
