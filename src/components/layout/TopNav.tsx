"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandWordmark } from "@/components/ui/BrandWordmark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { common, t } from "@/lib/i18n/common";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/domain";

export function TopNav({ currentUser }: { currentUser: User | null }) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const links: { href: string; label: string }[] = [
    { href: "/workspace", label: t(common.ideas, locale) },
    { href: "/pitches", label: t(common.pitches, locale) },
    ...(currentUser?.isAdmin ? [{ href: "/admin", label: t(common.admin, locale) }] : []),
  ];

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={currentUser ? "/workspace" : "/login"} aria-label={t(common.appName, locale)} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2">
          <BrandWordmark />
        </Link>
        {currentUser && (
          <nav className="flex flex-1 items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(l.href)
                    ? "text-accent-600"
                    : "text-ink-600 hover:bg-muted hover:text-ink-900"
                )}
              >
                {l.label}
                {pathname.startsWith(l.href) && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-accent-500" aria-hidden />
                )}
              </Link>
            ))}
          </nav>
        )}
        <div className={cn("flex items-center gap-2", !currentUser && "flex-1 justify-end")}>
          <LanguageSwitcher />
          {currentUser && (
            <>
              <span className="hidden items-center gap-1.5 text-sm text-ink-600 sm:inline-flex">
                {currentUser.name}
                {/* Display label only — this app has a single account type (see
                    supabase/migrations/0005_single_participant_role.sql), so this is just
                    wording, not a role: every non-admin account reads "Moderator" here. */}
                {!currentUser.isAdmin && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                    {t(common.moderator, locale)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2"
              >
                {t(common.signOut, locale)}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
