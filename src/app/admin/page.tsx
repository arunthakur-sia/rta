import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getServerLocale } from "@/lib/i18n/locale.server";
import { getAdminUsageOverview } from "@/lib/db/queries/tokenUsage";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Locale } from "@/lib/types/domain";

const copy = {
  title: { en: "Token usage", ar: "استخدام الرموز" },
  subtitle: {
    en: "LLM token consumption across the platform, broken down by participant, idea, and pitch (slide deck).",
    ar: "استهلاك رموز نموذج اللغة عبر المنصة، مقسمًا حسب المشارك والفكرة والعرض (ملف الشرائح).",
  },
  totalCalls: { en: "Model calls", ar: "عدد الاستدعاءات" },
  promptTokens: { en: "Prompt tokens", ar: "رموز الطلب" },
  completionTokens: { en: "Completion tokens", ar: "رموز الاستجابة" },
  totalTokens: { en: "Total tokens", ar: "إجمالي الرموز" },
  byUser: { en: "By participant", ar: "حسب المشارك" },
  byIdea: { en: "By idea", ar: "حسب الفكرة" },
  byPitch: { en: "By pitch (slide deck)", ar: "حسب العرض (ملف الشرائح)" },
  participant: { en: "Participant", ar: "المشارك" },
  idea: { en: "Idea", ar: "الفكرة" },
  pitch: { en: "Pitch deck", ar: "ملف العرض" },
  owner: { en: "Owner", ar: "المالك" },
  calls: { en: "Calls", ar: "الاستدعاءات" },
  tokens: { en: "Tokens", ar: "الرموز" },
  empty: { en: "No LLM calls recorded yet.", ar: "لم يتم تسجيل أي استدعاءات بعد." },
  untitledDeck: { en: "(no deck uploaded)", ar: "(لم يتم رفع ملف)" },
} as const;

function tr(entry: { en: string; ar: string }, locale: Locale) {
  return locale === "ar" ? entry.ar : entry.en;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
        <div className="text-2xl font-semibold text-ink-900">{value.toLocaleString()}</div>
      </CardBody>
    </Card>
  );
}

export default async function AdminUsagePage() {
  await requireAdmin();
  const locale = await getServerLocale();
  const overview = await getAdminUsageOverview();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{tr(copy.title, locale)}</h1>
        <p className="mt-1 text-sm text-ink-500">{tr(copy.subtitle, locale)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={tr(copy.totalCalls, locale)} value={overview.totals.callCount} />
        <StatCard label={tr(copy.promptTokens, locale)} value={overview.totals.promptTokens} />
        <StatCard label={tr(copy.completionTokens, locale)} value={overview.totals.completionTokens} />
        <StatCard label={tr(copy.totalTokens, locale)} value={overview.totals.totalTokens} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tr(copy.byUser, locale)}</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {overview.byUser.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">{tr(copy.empty, locale)}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2 font-medium">{tr(copy.participant, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.calls, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.promptTokens, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.completionTokens, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.totalTokens, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {overview.byUser.map((u) => (
                  <tr key={u.userId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink-900">{u.userName}</div>
                      <div className="text-xs text-ink-500">{u.userEmail}</div>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{u.callCount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-ink-700">{u.promptTokens.toLocaleString()}</td>
                    <td className="px-5 py-3 text-ink-700">{u.completionTokens.toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{u.totalTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr(copy.byIdea, locale)}</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {overview.byIdea.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">{tr(copy.empty, locale)}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2 font-medium">{tr(copy.idea, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.owner, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.calls, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.totalTokens, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {overview.byIdea.map((i) => (
                  <tr key={i.ideaId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/workspace/${i.ideaId}`} className="font-medium text-accent-600 hover:underline">
                        {i.ideaTitle}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{i.ownerName}</td>
                    <td className="px-5 py-3 text-ink-700">{i.callCount.toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{i.totalTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr(copy.byPitch, locale)}</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {overview.byPitch.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">{tr(copy.empty, locale)}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2 font-medium">{tr(copy.pitch, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.idea, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.owner, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.calls, locale)}</th>
                  <th className="px-5 py-2 font-medium">{tr(copy.totalTokens, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {overview.byPitch.map((p) => (
                  <tr key={p.pitchId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/pitches/${p.pitchId}`} className="font-medium text-accent-600 hover:underline">
                        {p.deckFileName ?? tr(copy.untitledDeck, locale)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{p.ideaTitle}</td>
                    <td className="px-5 py-3 text-ink-700">{p.ownerName}</td>
                    <td className="px-5 py-3 text-ink-700">{p.callCount.toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{p.totalTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
