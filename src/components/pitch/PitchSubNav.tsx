"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const tabs = [
  { seg: "studio", en: "Pitch Studio", ar: "استوديو العرض" },
  { seg: "structure", en: "Structure Map", ar: "خريطة البنية" },
  { seg: "coherence", en: "Coherence Report", ar: "تقرير الاتساق" },
  { seg: "mock-jury", en: "Mock Jury", ar: "لجنة تحكيم تجريبية" },
  { seg: "readiness", en: "Readiness", ar: "الجاهزية" },
];

export function PitchSubNav({ pitchId }: { pitchId: string }) {
  const { locale } = useLocale();
  const pathname = usePathname();

  return (
    <nav className="no-print flex flex-wrap gap-1 border-b border-border pb-2">
      {tabs.map((tab) => {
        const href = `/pitches/${pitchId}/${tab.seg}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.seg}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              active ? "bg-accent-100 text-accent-700" : "text-ink-600 hover:bg-muted"
            )}
          >
            {locale === "ar" ? tab.ar : tab.en}
          </Link>
        );
      })}
    </nav>
  );
}
