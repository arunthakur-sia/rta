import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getIdeaById } from "@/lib/db/queries/ideas";
import { IdeaSubNav } from "@/components/idea/IdeaSubNav";
import { DeleteButton } from "@/components/ui/DeleteButton";

export default async function IdeaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  const user = await requireUser();
  const idea = await getIdeaById(ideaId);
  if (!idea) notFound();

  return (
    // Breaks out of AppShell's max-w-7xl so the sidebar + content have room on wide screens.
    <div className="mx-[calc(50%-50vw)] w-screen">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-ink-900">{idea.title}</h1>
          {idea.ownerId === user.id && (
            <DeleteButton
              deleteUrl={`/api/ideas/${idea.id}`}
              redirectTo="/workspace"
              confirmMessage={{
                en: "Delete this idea and everything built from it (pitches, assessments, evidence)? This cannot be undone.",
                ar: "حذف هذه الفكرة وكل ما تم بناؤه منها (العروض، التقييمات، الأدلة)؟ لا يمكن التراجع عن هذا.",
              }}
            />
          )}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <IdeaSubNav ideaId={idea.id} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
