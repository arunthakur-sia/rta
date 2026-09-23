"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const tabs = [
  { seg: "", en: "Overview", ar: "نظرة عامة" },
  { seg: "pillars", en: "5 pillars", ar: "الركائز الخمس" },
  { seg: "plan", en: "Plan & review", ar: "الخطة والمراجعة" },
];

export function IdeaSubNav({ ideaId }: { ideaId: string }) {
  const { locale } = useLocale();
  const pathname = usePathname();

  return (
    <nav className="no-print flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible">
      {tabs.map((tab) => {
        const href = tab.seg ? `/workspace/${ideaId}/${tab.seg}` : `/workspace/${ideaId}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.seg || "overview"}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
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
