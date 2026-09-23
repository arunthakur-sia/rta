import { getIdeaById } from "@/lib/db/queries/ideas";
import { getPitchById } from "@/lib/db/queries/pitches";
import { PitchSubNav } from "@/components/pitch/PitchSubNav";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function PitchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ pitchId: string }>;
}) {
  const { pitchId } = await params;
  const user = await requireUser();
  const pitch = await getPitchById(pitchId);
  if (!pitch) notFound();
  const idea = await getIdeaById(pitch.ideaId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">{idea?.title ?? "Pitch"}</h1>
        {pitch.ownerId === user.id && (
          <DeleteButton
            deleteUrl={`/api/pitches/${pitch.id}`}
            redirectTo="/pitches"
            confirmMessage={{
              en: "Delete this pitch and its deck, runs and mock jury answers? This cannot be undone.",
              ar: "حذف هذا العرض والملف والتشغيلات وإجابات هيئة المحلفين الوهمية؟ لا يمكن التراجع عن هذا.",
            }}
          />
        )}
      </div>
      <PitchSubNav pitchId={pitchId} />
      {children}
    </div>
  );
}
