// Shared domain types for the RTA Innovation Professional Program agents.
// These mirror the Postgres schema (see supabase/migrations/0001_init.sql) and the output
// schemas in Appendix A of the build-out plan.

export type Locale = "en" | "ar";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type IdeaDimensionName =
  | "problem_clarity"
  | "user_evidence"
  | "value_viability"
  | "feasibility"
  | "novelty_risk";

export type PitchDimensionName =
  | "narrative_clarity"
  | "evidence_traction"
  | "value_to_rta"
  | "plan_and_ask"
  | "delivery_timing"
  | "visual_clarity"
  | "qa_resilience";

export type IdeaVerdict = "ready_to_prototype" | "refine_and_resubmit" | "pivot";
export type PitchVerdict = "ready_for_demo_day" | "rehearse" | "rework";

export type IdeaStage =
  | "intake"
  | "clarify"
  | "assess"
  | "critique"
  | "verdict"
  | "prototype_plan"
  | "closed";

export type PitchStage =
  | "upload"
  | "parse_check"
  | "structure"
  | "content"
  | "coherence"
  | "mock_jury"
  | "readiness"
  | "closed";

export interface WhatMustChange {
  customerCommunication: string;
  processOrServiceRules: string;
  digitalCapability: string;
  operationsAndEcosystem: string;
}

export interface IdeaCanvas {
  tableTheme: string;
  prioritisedChallenge: string;
  howItWorks: string;
  whyItImprovesAdoption: string;
  currentExperience: string;
  proposedExperience: string;
  whatMustChange: WhatMustChange;
  assumptionsRisksDependencies: string;
  expectedImpact: number | null;
  implementationFeasibility: number | null;
}

export interface TeamProfile {
  size: number;
  skills: string[];
  hoursPerWeek: number;
}

export interface EvidenceItem {
  id: string;
  kind: "note" | "data_point" | "link" | "file";
  content: string;
  url?: string;
  createdAt: string;
}

export interface Clarification {
  id: string;
  question: string;
  whyWeAsk: string;
  answer: string;
  dimension: IdeaDimensionName | null;
  createdAt: string;
}

export interface EvidenceRef {
  source: string; // canvas.field | clarification.<id> | evidence.<id> | web
  quote: string;
  url: string | null;
}

export interface DimensionRating {
  name: IdeaDimensionName;
  /** 1-5, or null for "insufficient information". Runtime-validated by zod; not a TS literal union so plain averaged/derived numbers still typecheck. */
  rating: number | null;
  anchor: string;
  evidence: EvidenceRef[];
  openQuestions: string[];
}

export interface IdeaAssessment {
  ideaId: string;
  version: number;
  language: Locale;
  dimensions: DimensionRating[];
  assumptionsToVerify: string[];
  topReasons: string[];
  confidence: "high" | "medium" | "low";
  weightedScore: number; // computed in app code
  verdict: IdeaVerdict; // computed in app code
  hardRuleTriggered: string | null;
  pivotReframings: string[] | null;
  createdAt: string;
}

export interface PrototypeOption {
  rung: number;
  type: string;
  tools: string[];
  buildItems: string[];
  effortTeamDays: { min: number; max: number };
  test: {
    protocol: string;
    users: number;
    metric: string;
    successThreshold: string;
    ifMissed: string;
  };
}

export interface PrototypePlan {
  ideaId: string;
  version: number;
  riskiestAssumption: string;
  primary: PrototypeOption;
  alternative: PrototypeOption;
  whyNotHigherFidelity: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  ownerId: string;
  title: string;
  canvas: IdeaCanvas;
  team: TeamProfile;
  evidence: EvidenceItem[];
  clarifications: Clarification[];
  stage: IdeaStage;
  currentAssessmentVersion: number;
  language: Locale;
  createdAt: string;
  updatedAt: string;
}

// --- Pitch validation ---

export type PitchTemplateSection =
  | "problem"
  | "users"
  | "validation"
  | "prototype"
  | "value"
  | "ask"
  | "team"
  | "other";

export interface Slide {
  index: number;
  title: string;
  body: string;
  notes: string;
  imageDescription: string | null;
  wordCount: number;
}

export interface StructureMapping {
  slide: number;
  section: PitchTemplateSection;
}

export interface StructureResult {
  mapping: StructureMapping[];
  missing: PitchTemplateSection[];
  suggestedOrder: number[];
}

export interface SlideComment {
  slide: number;
  element: "title" | "body" | "visual" | "notes";
  quote: string;
  issue: string;
  rewrite: string;
  priority: "high" | "medium" | "low";
  resolved: boolean;
}

export type CoherenceStatus = "supported" | "overstated" | "changed" | "unsupported";

export interface CoherenceRow {
  slide: number;
  claim: string;
  recordRef: string;
  status: CoherenceStatus;
}

export interface PitchDimensionRating {
  name: PitchDimensionName;
  rating: number;
  anchor: string;
  evidence: string[];
}

export interface JuryPersona {
  id: string;
  name: string;
  role: string;
  focus: string;
}

export interface MockJuryTurn {
  id: string;
  personaId: string;
  question: string;
  weakPointRef: string | null;
  answer: string | null;
  evaluation: string | null;
  modelAnswer: string | null;
  askedAt: string;
  answeredAt: string | null;
}

export interface ReadinessAction {
  priority: number;
  text: string;
  link: string; // slide:n | jury:n
  done: boolean;
}

export interface PitchRun {
  pitchId: string;
  version: number;
  language: Locale;
  structure: StructureResult;
  comments: SlideComment[];
  coherence: CoherenceRow[];
  // null until the readiness node finishes — structure/content/coherence
  // are saved progressively as each stage completes, before mock jury and
  // readiness scoring run.
  dimensions: PitchDimensionRating[] | null;
  actions: ReadinessAction[] | null;
  readinessScore: number | null; // computed in app code
  verdict: PitchVerdict | null; // computed in app code
  hardRuleTriggered: string | null;
  createdAt: string;
}

/** A PitchRun once readiness has actually scored it — the shape the readiness dashboard and verdict badges need. */
export type ScoredPitchRun = PitchRun & {
  dimensions: PitchDimensionRating[];
  actions: ReadinessAction[];
  readinessScore: number;
  verdict: PitchVerdict;
};

export interface Pitch {
  id: string;
  ideaId: string;
  ownerId: string;
  deckFileName: string | null;
  deckStoragePath: string | null;
  slides: Slide[];
  parseConfirmed: boolean;
  script: string | null;
  demoFormat: { timeLimitMinutes: number; juryComposition: string[]; questionTimeSeconds: number };
  mockJuryLog: MockJuryTurn[];
  stage: PitchStage;
  currentRunVersion: number;
  language: Locale;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: "idea" | "pitch";
  entityId: string;
  actorId: string;
  action: string;
  detail: string;
  createdAt: string;
}
