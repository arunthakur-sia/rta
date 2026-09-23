"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { PitchSessionInterrupt } from "@/lib/agents/pitch-validation/runner";

const copy = {
  run: { en: "Run agent", ar: "تشغيل العامل" },
  rerun: { en: "Re-run (new version)", ar: "إعادة التشغيل (نسخة جديدة)" },
  working: { en: "Running structure, content, coherence, mock jury and readiness…", ar: "جارٍ تنفيذ البنية والمحتوى والاتساق ولجنة التحكيم والجاهزية…" },
};

function t(entry: { en: string; ar: string }, locale: "en" | "ar") {
  return locale === "ar" ? entry.ar : entry.en;
}

export function RunAgentButton({ pitchId, isRerun }: { pitchId: string; isRerun?: boolean }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    const res = await fetch(`/api/pitches/${pitchId}/run`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Failed to start the agent");
      setRunning(false);
      return;
    }
    const data = (await res.json()) as { status: string; interrupt?: PitchSessionInterrupt };
    if (data.interrupt?.type === "mock_jury_question") {
      router.push(`/pitches/${pitchId}/mock-jury`);
    } else {
      router.push(`/pitches/${pitchId}/readiness`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {running ? (
        <p className="text-sm text-accent-700">{t(copy.working, locale)}</p>
      ) : (
        <Button onClick={run}>{t(isRerun ? copy.rerun : copy.run, locale)}</Button>
      )}
      {error && <p className="text-sm text-verdict-refine">{error}</p>}
    </div>
  );
}
