import { getSupabase } from "@/lib/supabase/client";
import type { AdminUsageOverview, IdeaUsageSummary, PitchUsageSummary, TokenUsageEntry, UsageTotals, UserUsageSummary } from "@/lib/types/domain";

export interface RecordTokenUsageInput {
  userId: string;
  ideaId?: string | null;
  pitchId?: string | null;
  stage: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Records one LLM call's token usage. Called from lib/llm/structured.ts
 * after every successful gateway call that carries a `usage` context (see
 * runStructured). Failures here are logged, not thrown — losing a usage
 * row for the admin dashboard should never take down the participant's
 * actual idea/pitch validation flow.
 */
export async function recordTokenUsage(entry: RecordTokenUsageInput): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("token_usage").insert({
    user_id: entry.userId,
    idea_id: entry.ideaId ?? null,
    pitch_id: entry.pitchId ?? null,
    stage: entry.stage,
    model: entry.model,
    prompt_tokens: entry.promptTokens,
    completion_tokens: entry.completionTokens,
    total_tokens: entry.totalTokens,
  });
  if (error) console.error(`[tokenUsage] failed to record usage: ${error.message}`);
}

interface TokenUsageRow {
  id: string;
  user_id: string;
  idea_id: string | null;
  pitch_id: string | null;
  stage: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

function rowToEntry(row: TokenUsageRow): TokenUsageEntry {
  return {
    id: row.id,
    userId: row.user_id,
    ideaId: row.idea_id,
    pitchId: row.pitch_id,
    stage: row.stage,
    model: row.model,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    createdAt: row.created_at,
  };
}

function emptyTotals(): UsageTotals {
  return { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function addEntry(totals: UsageTotals, entry: TokenUsageEntry): void {
  totals.callCount += 1;
  totals.promptTokens += entry.promptTokens;
  totals.completionTokens += entry.completionTokens;
  totals.totalTokens += entry.totalTokens;
}

/**
 * Everything the admin usage dashboard needs in one call: overall totals,
 * plus the same rows rolled up per user, per idea, and per pitch (slide
 * deck). Aggregation happens here in app code rather than via Postgres
 * GROUP BY, matching how the rest of lib/db/queries assembles records —
 * fetch flat rows, join and compute in TypeScript.
 */
export async function getAdminUsageOverview(): Promise<AdminUsageOverview> {
  const db = getSupabase();

  const [usageRes, usersRes, ideasRes, pitchesRes] = await Promise.all([
    db.from("token_usage").select("*").order("created_at", { ascending: false }),
    db.from("users").select("id, name, email"),
    db.from("ideas").select("id, title, owner_id"),
    db.from("pitches").select("id, idea_id, owner_id, deck_file_name"),
  ]);
  if (usageRes.error) throw new Error(`Supabase error: ${usageRes.error.message}`);
  if (usersRes.error) throw new Error(`Supabase error: ${usersRes.error.message}`);
  if (ideasRes.error) throw new Error(`Supabase error: ${ideasRes.error.message}`);
  if (pitchesRes.error) throw new Error(`Supabase error: ${pitchesRes.error.message}`);

  const entries = ((usageRes.data ?? []) as TokenUsageRow[]).map(rowToEntry);
  const users = new Map((usersRes.data as { id: string; name: string; email: string }[]).map((u) => [u.id, u]));
  const ideas = new Map((ideasRes.data as { id: string; title: string; owner_id: string }[]).map((i) => [i.id, i]));
  const pitches = new Map(
    (pitchesRes.data as { id: string; idea_id: string; owner_id: string; deck_file_name: string | null }[]).map((p) => [p.id, p])
  );

  const totals = emptyTotals();
  const byUser = new Map<string, UserUsageSummary>();
  const byIdea = new Map<string, IdeaUsageSummary>();
  const byPitch = new Map<string, PitchUsageSummary>();

  for (const entry of entries) {
    addEntry(totals, entry);

    const user = users.get(entry.userId);
    if (!byUser.has(entry.userId)) {
      byUser.set(entry.userId, {
        ...emptyTotals(),
        userId: entry.userId,
        userName: user?.name ?? "(deleted user)",
        userEmail: user?.email ?? "",
      });
    }
    addEntry(byUser.get(entry.userId)!, entry);

    if (entry.ideaId) {
      const idea = ideas.get(entry.ideaId);
      if (!byIdea.has(entry.ideaId)) {
        byIdea.set(entry.ideaId, {
          ...emptyTotals(),
          ideaId: entry.ideaId,
          ideaTitle: idea?.title ?? "(deleted idea)",
          ownerId: idea?.owner_id ?? entry.userId,
          ownerName: users.get(idea?.owner_id ?? entry.userId)?.name ?? "",
        });
      }
      addEntry(byIdea.get(entry.ideaId)!, entry);
    }

    if (entry.pitchId) {
      const pitch = pitches.get(entry.pitchId);
      if (!byPitch.has(entry.pitchId)) {
        byPitch.set(entry.pitchId, {
          ...emptyTotals(),
          pitchId: entry.pitchId,
          ideaId: pitch?.idea_id ?? entry.ideaId ?? "",
          ideaTitle: ideas.get(pitch?.idea_id ?? "")?.title ?? "(deleted idea)",
          deckFileName: pitch?.deck_file_name ?? null,
          ownerId: pitch?.owner_id ?? entry.userId,
          ownerName: users.get(pitch?.owner_id ?? entry.userId)?.name ?? "",
        });
      }
      addEntry(byPitch.get(entry.pitchId)!, entry);
    }
  }

  const byTotalDesc = (a: UsageTotals, b: UsageTotals) => b.totalTokens - a.totalTokens;

  return {
    totals,
    byUser: [...byUser.values()].sort(byTotalDesc),
    byIdea: [...byIdea.values()].sort(byTotalDesc),
    byPitch: [...byPitch.values()].sort(byTotalDesc),
  };
}
