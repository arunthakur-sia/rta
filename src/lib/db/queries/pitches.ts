import { getSupabase, unwrap } from "@/lib/supabase/client";
import { demoDayDefaultFormat } from "@/lib/skills/pitchRubric";
import type { MockJuryTurn, Pitch, PitchRun, PitchStage, Slide } from "@/lib/types/domain";

interface PitchRow {
  id: string;
  idea_id: string;
  owner_id: string;
  deck_file_name: string | null;
  deck_storage_path: string | null;
  slides: Slide[];
  parse_confirmed: boolean;
  script: string | null;
  demo_format: Pitch["demoFormat"];
  stage: PitchStage;
  current_run_version: number;
  language: "en" | "ar";
  created_at: string;
  updated_at: string;
}

function rowToPitchBase(row: PitchRow): Omit<Pitch, "mockJuryLog"> {
  return {
    id: row.id,
    ideaId: row.idea_id,
    ownerId: row.owner_id,
    deckFileName: row.deck_file_name,
    deckStoragePath: row.deck_storage_path,
    slides: row.slides,
    parseConfirmed: row.parse_confirmed,
    script: row.script,
    demoFormat: row.demo_format,
    stage: row.stage,
    currentRunVersion: row.current_run_version,
    language: row.language,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assemblePitch(row: PitchRow): Promise<Pitch> {
  return { ...rowToPitchBase(row), mockJuryLog: await listMockJuryTurns(row.id) };
}

export async function createPitch(input: { ideaId: string; ownerId: string; language: "en" | "ar" }): Promise<Pitch> {
  const db = getSupabase();
  const row = unwrap(
    await db
      .from("pitches")
      .insert({
        idea_id: input.ideaId,
        owner_id: input.ownerId,
        language: input.language,
        demo_format: demoDayDefaultFormat,
      })
      .select()
      .single()
  ) as PitchRow;
  return assemblePitch(row);
}

export async function getPitchById(id: string): Promise<Pitch | null> {
  const db = getSupabase();
  const { data, error } = await db.from("pitches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) return null;
  return assemblePitch(data as PitchRow);
}

export async function deletePitch(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("pitches").delete().eq("id", id);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function listPitchesForIdea(ideaId: string): Promise<Pitch[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("pitches").select("*").eq("idea_id", ideaId).order("created_at", { ascending: false })
  ) as PitchRow[];
  return Promise.all(rows.map(assemblePitch));
}

export async function listPitchesForOwner(ownerId: string): Promise<Pitch[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("pitches").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false })
  ) as PitchRow[];
  return Promise.all(rows.map(assemblePitch));
}

export async function saveUploadedDeck(
  pitchId: string,
  fileName: string,
  storagePath: string,
  slides: Slide[],
  script: string | null
): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("pitches")
    .update({
      deck_file_name: fileName,
      deck_storage_path: storagePath,
      slides,
      script,
      parse_confirmed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pitchId);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function confirmParse(pitchId: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("pitches")
    .update({ parse_confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", pitchId);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function setPitchStage(id: string, stage: PitchStage): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("pitches").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

// -- Mock jury --

interface MockJuryRow {
  id: string;
  persona_id: string;
  question: string;
  weak_point_ref: string | null;
  answer: string | null;
  evaluation: string | null;
  model_answer: string | null;
  asked_at: string;
  answered_at: string | null;
}

function rowToMockJuryTurn(r: MockJuryRow): MockJuryTurn {
  return {
    id: r.id,
    personaId: r.persona_id,
    question: r.question,
    weakPointRef: r.weak_point_ref,
    answer: r.answer,
    evaluation: r.evaluation,
    modelAnswer: r.model_answer,
    askedAt: r.asked_at,
    answeredAt: r.answered_at,
  };
}

export async function listMockJuryTurns(pitchId: string): Promise<MockJuryTurn[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("pitch_mock_jury").select("*").eq("pitch_id", pitchId).order("asked_at")
  ) as MockJuryRow[];
  return rows.map(rowToMockJuryTurn);
}

export async function addMockJuryQuestion(
  pitchId: string,
  personaId: string,
  question: string,
  weakPointRef: string | null
): Promise<MockJuryTurn> {
  const db = getSupabase();
  const row = unwrap(
    await db
      .from("pitch_mock_jury")
      .insert({ pitch_id: pitchId, persona_id: personaId, question, weak_point_ref: weakPointRef })
      .select()
      .single()
  ) as MockJuryRow;
  return rowToMockJuryTurn(row);
}

export async function answerMockJuryQuestion(
  turnId: string,
  answer: string,
  evaluation: string,
  modelAnswer: string
): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("pitch_mock_jury")
    .update({ answer, evaluation, model_answer: modelAnswer, answered_at: new Date().toISOString() })
    .eq("id", turnId);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

// -- Pitch runs (versioned) --

interface PitchRunRow {
  pitch_id: string;
  version: number;
  language: "en" | "ar";
  structure: PitchRun["structure"];
  comments: PitchRun["comments"];
  coherence: PitchRun["coherence"];
  dimensions: PitchRun["dimensions"];
  actions: PitchRun["actions"];
  readiness_score: PitchRun["readinessScore"];
  verdict: PitchRun["verdict"];
  hard_rule_triggered: string | null;
  created_at: string;
}

function rowToPitchRun(r: PitchRunRow): PitchRun {
  return {
    pitchId: r.pitch_id,
    version: r.version,
    language: r.language,
    structure: r.structure,
    comments: r.comments,
    coherence: r.coherence,
    dimensions: r.dimensions,
    actions: r.actions,
    readinessScore: r.readiness_score,
    verdict: r.verdict,
    hardRuleTriggered: r.hard_rule_triggered,
    createdAt: r.created_at,
  };
}

/**
 * Upsert, not insert — this is called progressively as each stage of a run
 * finishes (structure, then content, then coherence, then readiness), all
 * writing the same (pitch_id, version) row so results are visible in the
 * UI as soon as they exist instead of only once the whole graph finishes.
 */
export async function savePitchRun(run: PitchRun): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("pitch_runs").upsert(
    {
      pitch_id: run.pitchId,
      version: run.version,
      language: run.language,
      structure: run.structure,
      comments: run.comments,
      coherence: run.coherence,
      dimensions: run.dimensions,
      actions: run.actions,
      readiness_score: run.readinessScore,
      verdict: run.verdict,
      hard_rule_triggered: run.hardRuleTriggered,
      created_at: run.createdAt,
    },
    { onConflict: "pitch_id,version" }
  );
  if (error) throw new Error(`Supabase error: ${error.message}`);
  const { error: updateError } = await db
    .from("pitches")
    .update({ current_run_version: run.version, updated_at: run.createdAt })
    .eq("id", run.pitchId);
  if (updateError) throw new Error(`Supabase error: ${updateError.message}`);
}

export async function getPitchRun(pitchId: string, version: number): Promise<PitchRun | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("pitch_runs")
    .select("*")
    .eq("pitch_id", pitchId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data ? rowToPitchRun(data as PitchRunRow) : null;
}

export async function listPitchRuns(pitchId: string): Promise<PitchRun[]> {
  const db = getSupabase();
  const rows = unwrap(await db.from("pitch_runs").select("*").eq("pitch_id", pitchId).order("version")) as PitchRunRow[];
  return rows.map(rowToPitchRun);
}

export async function nextPitchRunVersion(pitchId: string): Promise<number> {
  const db = getSupabase();
  const { data, error } = await db
    .from("pitch_runs")
    .select("version")
    .eq("pitch_id", pitchId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return ((data as { version: number } | null)?.version ?? 0) + 1;
}
