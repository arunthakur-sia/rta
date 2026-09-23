import { getSupabase, unwrap } from "@/lib/supabase/client";
import type {
  Clarification,
  EvidenceItem,
  Idea,
  IdeaAssessment,
  IdeaCanvas,
  IdeaStage,
  PrototypePlan,
  TeamProfile,
} from "@/lib/types/domain";

interface IdeaRow {
  id: string;
  owner_id: string;
  title: string;
  canvas: IdeaCanvas;
  team: TeamProfile;
  stage: IdeaStage;
  current_assessment_version: number;
  language: "en" | "ar";
  created_at: string;
  updated_at: string;
}

function rowToIdeaBase(row: IdeaRow): Omit<Idea, "evidence" | "clarifications"> {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    canvas: row.canvas,
    team: row.team,
    stage: row.stage,
    currentAssessmentVersion: row.current_assessment_version,
    language: row.language,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assembleIdea(row: IdeaRow): Promise<Idea> {
  const [evidence, clarifications] = await Promise.all([listEvidence(row.id), listClarifications(row.id)]);
  return { ...rowToIdeaBase(row), evidence, clarifications };
}

export async function createIdea(input: {
  ownerId: string;
  title: string;
  canvas: IdeaCanvas;
  team: TeamProfile;
  language: "en" | "ar";
}): Promise<Idea> {
  const db = getSupabase();
  const row = unwrap(
    await db
      .from("ideas")
      .insert({
        owner_id: input.ownerId,
        title: input.title,
        canvas: input.canvas,
        team: input.team,
        language: input.language,
      })
      .select()
      .single()
  ) as IdeaRow;
  return assembleIdea(row);
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const db = getSupabase();
  const { data, error } = await db.from("ideas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) return null;
  return assembleIdea(data as IdeaRow);
}

export async function deleteIdea(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("ideas").delete().eq("id", id);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function listIdeasForOwner(ownerId: string): Promise<Idea[]> {
  const db = getSupabase();
  const rows = unwrap(await db.from("ideas").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false })) as IdeaRow[];
  return Promise.all(rows.map(assembleIdea));
}

export async function updateIdeaCanvas(id: string, canvas: IdeaCanvas, team: TeamProfile): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("ideas").update({ canvas, team, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function setIdeaStage(id: string, stage: IdeaStage): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("ideas").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

// -- Evidence --

interface EvidenceRow {
  id: string;
  kind: EvidenceItem["kind"];
  content: string;
  url: string | null;
  created_at: string;
}

export async function listEvidence(ideaId: string): Promise<EvidenceItem[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("idea_evidence").select("*").eq("idea_id", ideaId).order("created_at")
  ) as EvidenceRow[];
  return rows.map((r) => ({ id: r.id, kind: r.kind, content: r.content, url: r.url ?? undefined, createdAt: r.created_at }));
}

export async function addEvidence(
  ideaId: string,
  kind: EvidenceItem["kind"],
  content: string,
  url?: string
): Promise<EvidenceItem> {
  const db = getSupabase();
  const row = unwrap(
    await db.from("idea_evidence").insert({ idea_id: ideaId, kind, content, url: url ?? null }).select().single()
  ) as EvidenceRow;
  await db.from("ideas").update({ updated_at: new Date().toISOString() }).eq("id", ideaId);
  return { id: row.id, kind: row.kind, content: row.content, url: row.url ?? undefined, createdAt: row.created_at };
}

// -- Clarifications --

interface ClarificationRow {
  id: string;
  question: string;
  why_we_ask: string;
  answer: string;
  dimension: string | null;
  created_at: string;
}

export async function listClarifications(ideaId: string): Promise<Clarification[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("idea_clarifications").select("*").eq("idea_id", ideaId).order("created_at")
  ) as ClarificationRow[];
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    whyWeAsk: r.why_we_ask,
    answer: r.answer,
    dimension: (r.dimension as Clarification["dimension"]) ?? null,
    createdAt: r.created_at,
  }));
}

export async function addClarificationQuestion(
  ideaId: string,
  question: string,
  whyWeAsk: string,
  dimension: Clarification["dimension"]
): Promise<Clarification> {
  const db = getSupabase();
  const row = unwrap(
    await db
      .from("idea_clarifications")
      .insert({ idea_id: ideaId, question, why_we_ask: whyWeAsk, dimension, answer: "" })
      .select()
      .single()
  ) as ClarificationRow;
  return {
    id: row.id,
    question: row.question,
    whyWeAsk: row.why_we_ask,
    answer: row.answer,
    dimension: (row.dimension as Clarification["dimension"]) ?? null,
    createdAt: row.created_at,
  };
}

export async function answerClarification(clarificationId: string, answer: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("idea_clarifications").update({ answer }).eq("id", clarificationId);
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

// -- Assessments (versioned) --

interface AssessmentRow {
  idea_id: string;
  version: number;
  language: "en" | "ar";
  dimensions: IdeaAssessment["dimensions"];
  assumptions_to_verify: string[];
  top_reasons: string[];
  confidence: IdeaAssessment["confidence"];
  weighted_score: number;
  verdict: IdeaAssessment["verdict"];
  hard_rule_triggered: string | null;
  pivot_reframings: string[] | null;
  created_at: string;
}

function rowToAssessment(r: AssessmentRow): IdeaAssessment {
  return {
    ideaId: r.idea_id,
    version: r.version,
    language: r.language,
    dimensions: r.dimensions,
    assumptionsToVerify: r.assumptions_to_verify,
    topReasons: r.top_reasons,
    confidence: r.confidence,
    weightedScore: r.weighted_score,
    verdict: r.verdict,
    hardRuleTriggered: r.hard_rule_triggered,
    pivotReframings: r.pivot_reframings,
    createdAt: r.created_at,
  };
}

export async function saveIdeaAssessment(assessment: IdeaAssessment): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("idea_assessments").insert({
    idea_id: assessment.ideaId,
    version: assessment.version,
    language: assessment.language,
    dimensions: assessment.dimensions,
    assumptions_to_verify: assessment.assumptionsToVerify,
    top_reasons: assessment.topReasons,
    confidence: assessment.confidence,
    weighted_score: assessment.weightedScore,
    verdict: assessment.verdict,
    hard_rule_triggered: assessment.hardRuleTriggered,
    pivot_reframings: assessment.pivotReframings,
    created_at: assessment.createdAt,
  });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  const { error: updateError } = await db
    .from("ideas")
    .update({ current_assessment_version: assessment.version, updated_at: assessment.createdAt })
    .eq("id", assessment.ideaId);
  if (updateError) throw new Error(`Supabase error: ${updateError.message}`);
}

export async function getIdeaAssessment(ideaId: string, version: number): Promise<IdeaAssessment | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("idea_assessments")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data ? rowToAssessment(data as AssessmentRow) : null;
}

export async function listIdeaAssessments(ideaId: string): Promise<IdeaAssessment[]> {
  const db = getSupabase();
  const rows = unwrap(
    await db.from("idea_assessments").select("*").eq("idea_id", ideaId).order("version")
  ) as AssessmentRow[];
  return rows.map(rowToAssessment);
}

export async function nextAssessmentVersion(ideaId: string): Promise<number> {
  const db = getSupabase();
  const { data, error } = await db
    .from("idea_assessments")
    .select("version")
    .eq("idea_id", ideaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return ((data as { version: number } | null)?.version ?? 0) + 1;
}

// -- Prototype plans (versioned) --

interface PrototypePlanRow {
  idea_id: string;
  version: number;
  riskiest_assumption: string;
  primary_option: PrototypePlan["primary"];
  alternative_option: PrototypePlan["alternative"];
  why_not_higher_fidelity: string;
  created_at: string;
}

function rowToPrototypePlan(r: PrototypePlanRow): PrototypePlan {
  return {
    ideaId: r.idea_id,
    version: r.version,
    riskiestAssumption: r.riskiest_assumption,
    primary: r.primary_option,
    alternative: r.alternative_option,
    whyNotHigherFidelity: r.why_not_higher_fidelity,
    createdAt: r.created_at,
  };
}

export async function savePrototypePlan(plan: PrototypePlan): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("idea_prototype_plans").insert({
    idea_id: plan.ideaId,
    version: plan.version,
    riskiest_assumption: plan.riskiestAssumption,
    primary_option: plan.primary,
    alternative_option: plan.alternative,
    why_not_higher_fidelity: plan.whyNotHigherFidelity,
    created_at: plan.createdAt,
  });
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function getLatestPrototypePlan(ideaId: string): Promise<PrototypePlan | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("idea_prototype_plans")
    .select("*")
    .eq("idea_id", ideaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data ? rowToPrototypePlan(data as PrototypePlanRow) : null;
}
