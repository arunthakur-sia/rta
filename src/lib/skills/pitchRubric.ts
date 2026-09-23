import type { PitchDimensionName, PitchTemplateSection } from "@/lib/types/domain";

export interface PitchRubricDimension {
  name: PitchDimensionName;
  weight: number;
  whatTheAgentLooksFor: string;
  source: string;
}

export const pitchRubric: PitchRubricDimension[] = [
  {
    name: "narrative_clarity",
    weight: 0.2,
    whatTheAgentLooksFor:
      "One problem, one solution, one ask; a listener can restate the pitch in two sentences",
    source: "Deck text, script",
  },
  {
    name: "evidence_traction",
    weight: 0.2,
    whatTheAgentLooksFor:
      "Prototype results, user quotes and data presented honestly and matching the record",
    source: "Deck, idea record, coherence report",
  },
  {
    name: "value_to_rta",
    weight: 0.2,
    whatTheAgentLooksFor:
      "Value mechanism and order of magnitude stated, linked to a named priority",
    source: "Deck, idea record",
  },
  {
    name: "plan_and_ask",
    weight: 0.15,
    whatTheAgentLooksFor: "Clear next step, resources requested, owner and timeline",
    source: "Deck",
  },
  {
    name: "delivery_timing",
    weight: 0.1,
    whatTheAgentLooksFor: "Within time limit, speaking pace, no slide overrun",
    source: "Script or transcript word count and structure",
  },
  {
    name: "visual_clarity",
    weight: 0.05,
    whatTheAgentLooksFor: "One message per slide, readable text, charts that support the point",
    source: "Slide heuristics and image descriptions",
  },
  {
    name: "qa_resilience",
    weight: 0.1,
    whatTheAgentLooksFor: "Answers are direct, honest about limits, backed by evidence",
    source: "Mock jury log",
  },
];

export const pitchVerdictThresholds = {
  readyForDemoDay: { min: 3.8, max: 5.0 },
  rehearse: { min: 2.8, max: 3.7 },
  rework: { min: 1.0, max: 2.7 },
};

export const pitchTemplateSections: PitchTemplateSection[] = [
  "problem",
  "users",
  "validation",
  "prototype",
  "value",
  "ask",
  "team",
];

export const demoDayDefaultFormat = {
  timeLimitMinutes: 5,
  juryComposition: ["Business sponsor", "Operations lead", "Technology lead"],
  questionTimeSeconds: 90,
};

export type JuryPersona = {
  id: string;
  name: string;
  role: string;
  focus: string;
};

export const juryPersonas: JuryPersona[] = [
  {
    id: "sponsor",
    name: "Business sponsor",
    role: "Owns an RTA priority area and controls whether this gets sponsored",
    focus: "Value to RTA, strategic fit, credibility of the ask",
  },
  {
    id: "ops",
    name: "Operations lead",
    role: "Would have to run or support this if it were adopted",
    focus: "Feasibility, what breaks at scale, who does the work day to day",
  },
  {
    id: "tech",
    name: "Technology lead",
    role: "Evaluates whether the prototype's evidence is real and reproducible",
    focus: "Evidence quality, data and system dependencies, what was actually tested",
  },
] as const;

export const speakingWordsPerMinute = 130;

/** "asks six to eight questions in turn" — fixed at the low end so a full mock jury run stays fast. */
export const MOCK_JURY_QUESTION_COUNT = 6;
