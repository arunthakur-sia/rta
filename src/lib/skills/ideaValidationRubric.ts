// RTA Idea Validation rubric — loaded on demand as a skill by Agent 1 and by
// the deterministic scoring engine (lib/scoring/ideaVerdict.ts). Anchors are
// reproduced from the program's rubric so the model rates against the same
// written anchors a human reviewer would use.

import type { IdeaDimensionName } from "@/lib/types/domain";

export interface RubricDimension {
  name: IdeaDimensionName;
  weight: number; // fraction, sums to 1
  rating1Anchor: string;
  rating5Anchor: string;
}

// Rating-1 anchors are deliberately reserved for a dimension the record
// never engages with at all (a blank canvas field the participant also
// never addressed when asked in clarification) — a workshop participant
// who honestly answers "haven't done that yet" plus any reasoning or
// intent to find out has still engaged, and should land at 3+, not 1.
// See the ASSESS prompt in agents/idea-validation/nodes.ts for the
// explicit floor-of-3 instruction this anchor wording is designed to support.
export const ideaValidationRubric: RubricDimension[] = [
  {
    name: "problem_clarity",
    weight: 0.2,
    rating1Anchor:
      "The canvas and clarifications never say who is affected or what the problem actually is, even roughly",
    rating5Anchor:
      "Specific problem, named user group, frequency and cost of the problem evidenced",
  },
  {
    name: "user_evidence",
    weight: 0.25,
    rating1Anchor:
      "User evidence is never raised at all, not even to say it hasn't been gathered yet",
    rating5Anchor:
      "Five or more user conversations or usage data confirming the problem and current workaround",
  },
  {
    name: "value_viability",
    weight: 0.2,
    rating1Anchor:
      "No value story is attempted at all, not even a qualitative one",
    rating5Anchor:
      "Value mechanism explained (time, cost, revenue, risk, experience) with an order-of-magnitude estimate and assumptions listed",
  },
  {
    name: "feasibility",
    weight: 0.2,
    rating1Anchor:
      "What would need to change to build this is never addressed, even in general terms",
    rating5Anchor:
      "Can be prototyped with no-code tools and existing data within the phase 4 window",
  },
  {
    name: "novelty_risk",
    weight: 0.15,
    rating1Anchor:
      "Existing solutions and risks are never mentioned at all, not even to say they haven't been checked",
    rating5Anchor:
      "Differentiation from existing solutions stated; top three risks named with mitigation",
  },
];

export const ideaVerdictThresholds = {
  readyToPrototype: { min: 3.0, max: 5.0 },
  refineAndResubmit: { min: 2.0, max: 2.9 },
  pivot: { min: 1.0, max: 1.9 },
};
