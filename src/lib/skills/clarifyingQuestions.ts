import type { IdeaDimensionName } from "@/lib/types/domain";

// Appendix C sample clarifying questions, tagged to the dimension each one
// is primarily meant to cover. The clarify node uses these as few-shot
// guidance, not a fixed script — the model still adapts questions to what is
// already covered on the canvas.

export const sampleClarifyingQuestions: { dimension: IdeaDimensionName; question: string }[] = [
  {
    dimension: "user_evidence",
    question:
      "Who exactly experiences this problem, how often, and what do they do about it today?",
  },
  {
    dimension: "user_evidence",
    question:
      "What did the people you spoke to say in their own words? Please paste one or two quotes.",
  },
  {
    dimension: "value_viability",
    question:
      "If this worked perfectly, what would change in numbers: minutes saved, errors avoided, revenue, satisfaction?",
  },
  {
    dimension: "feasibility",
    question:
      "What data, system access or approval does a first prototype need, and do you already have it?",
  },
  {
    dimension: "novelty_risk",
    question:
      "What already exists inside RTA or in the market that solves part of this, and what is different about your approach?",
  },
  {
    dimension: "novelty_risk",
    question: "What is the one assumption that, if wrong, makes this idea not worth doing?",
  },
];

export const MAX_CLARIFYING_QUESTIONS = 8;
