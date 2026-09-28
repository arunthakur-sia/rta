"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CyclingStatus } from "@/components/ui/CyclingStatus";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { PitchSessionInterrupt } from "@/lib/agents/pitch-validation/runner";

const copy = {
  run: { en: "Run agent", ar: "تشغيل العامل" },
  rerun: { en: "Re-run (new version)", ar: "إعادة التشغيل (نسخة جديدة)" },
  working: { en: "Working…", ar: "جارٍ العمل…" },
  workingNote: { en: "This can take up to a minute.", ar: "قد يستغرق ذلك حتى دقيقة." },
};

const runningSteps = {
  en: ["Checking structure…", "Reviewing content…", "Checking coherence…"],
  ar: ["التحقق من البنية…", "مراجعة المحتوى…", "التحقق من الاتساق…"],
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
      <Button onClick={run} disabled={running}>
        {running && <Spinner />}
        {running ? t(copy.working, locale) : t(isRerun ? copy.rerun : copy.run, locale)}
      </Button>
      {running && (
        <p className="text-sm text-ink-500">
          <CyclingStatus messages={runningSteps[locale]} /> {t(copy.workingNote, locale)}
        </p>
      )}
      {error && <p className="text-sm text-verdict-refine">{error}</p>}
    </div>
  );
}
