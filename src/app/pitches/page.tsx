import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listPitchesForOwner } from "@/lib/db/queries/pitches";
import { getIdeaById } from "@/lib/db/queries/ideas";
import { getServerLocale } from "@/lib/i18n/locale.server";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, PitchVerdictBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getPitchRun } from "@/lib/db/queries/pitches";
import { pitchVerdictLabels, label } from "@/lib/skills/glossary";
import { common, t } from "@/lib/i18n/common";

export default async function PitchesListPage() {
  const user = await requireUser();
  const locale = await getServerLocale();
  const pitches = await listPitchesForOwner(user.id);

  const rows = await Promise.all(
    pitches.map(async (pitch) => ({
      pitch,
      idea: await getIdeaById(pitch.ideaId),
      run: pitch.currentRunVersion > 0 ? await getPitchRun(pitch.id, pitch.currentRunVersion) : null,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{t(common.pitches, locale)}</h1>
        <Link href="/pitches/new" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600">
          {locale === "ar" ? "عرض جديد" : "New pitch"}
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-ink-500">{locale === "ar" ? "لا توجد عروض بعد." : "No pitches yet."}</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ pitch, idea, run }) => (
            <Card key={pitch.id} className="relative h-full transition-shadow hover:shadow-md">
              <Link href={`/pitches/${pitch.id}/studio`} className="block">
                <CardBody className="space-y-2">
                  <h2 className="pr-14 font-medium text-ink-900">{idea?.title ?? pitch.id}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{pitch.stage.replaceAll("_", " ")}</Badge>
                    {run && run.verdict && <PitchVerdictBadge verdict={run.verdict} label={label(pitchVerdictLabels[run.verdict], locale)} />}
                  </div>
                </CardBody>
              </Link>
              {pitch.ownerId === user.id && (
                <DeleteButton
                  deleteUrl={`/api/pitches/${pitch.id}`}
                  confirmMessage={{
                    en: "Delete this pitch and its deck, runs and mock jury answers? This cannot be undone.",
                    ar: "حذف هذا العرض والملف والتشغيلات وإجابات هيئة المحلفين الوهمية؟ لا يمكن التراجع عن هذا.",
                  }}
                  className="absolute right-4 top-4 text-xs font-medium text-ink-400 hover:text-verdict-pivot"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
