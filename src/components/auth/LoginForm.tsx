"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const copy = {
  title: { en: "Sign in", ar: "تسجيل الدخول" },
  subtitle: { en: "RTA Innovation Professional Program", ar: "برنامج الابتكار المهني لهيئة الطرق والنقل" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  submit: { en: "Sign in", ar: "تسجيل الدخول" },
  submitting: { en: "Signing in…", ar: "جارٍ تسجيل الدخول…" },
  invalid: { en: "Invalid email or password.", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
  networkError: { en: "Couldn't reach the server. Try again.", ar: "تعذر الوصول إلى الخادم. حاول مرة أخرى." },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function LoginForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setSubmitting(false);
        setError(t(copy.invalid, locale));
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/workspace");
      router.refresh();
    } catch {
      setSubmitting(false);
      setError(t(copy.networkError, locale));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t(copy.title, locale)}</CardTitle>
          <p className="mt-1 text-sm text-ink-500">{t(copy.subtitle, locale)}</p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t(copy.email, locale)}</label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t(copy.password, locale)}</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-verdict-refine">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting || !email.trim() || !password}>
              {submitting ? t(copy.submitting, locale) : t(copy.submit, locale)}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
