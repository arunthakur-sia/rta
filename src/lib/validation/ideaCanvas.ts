import type { IdeaCanvas, TeamProfile, WhatMustChange } from "@/lib/types/domain";

const MIN_FIELD_LENGTH = 20;

export interface CanvasCompleteness {
  complete: boolean;
  missingFields: string[];
}

/**
 * "The application checks canvas completeness; fields under a minimum
 * length are flagged and must be completed before the session starts. No
 * model call yet." — Agent 1 process flow, Intake.
 */
export function checkCanvasCompleteness(canvas: IdeaCanvas, team: TeamProfile): CanvasCompleteness {
  const missingFields: string[] = [];

  const longFormFields: (keyof IdeaCanvas)[] = [
    "howItWorks",
    "whyItImprovesAdoption",
    "currentExperience",
    "proposedExperience",
    "assumptionsRisksDependencies",
  ];
  for (const field of longFormFields) {
    const value = canvas[field];
    if (typeof value === "string" && value.trim().length < MIN_FIELD_LENGTH) {
      missingFields.push(field);
    }
  }

  const shortFields: (keyof IdeaCanvas)[] = ["tableTheme", "prioritisedChallenge"];
  for (const field of shortFields) {
    const value = canvas[field];
    if (typeof value === "string" && value.trim().length === 0) {
      missingFields.push(field);
    }
  }

  const whatMustChangeFields: (keyof WhatMustChange)[] = [
    "customerCommunication",
    "processOrServiceRules",
    "digitalCapability",
    "operationsAndEcosystem",
  ];
  for (const field of whatMustChangeFields) {
    if (canvas.whatMustChange[field].trim().length === 0) {
      missingFields.push(`whatMustChange.${field}`);
    }
  }

  if (team.size < 1) missingFields.push("team.size");

  return { complete: missingFields.length === 0, missingFields };
}

export const CANVAS_MIN_FIELD_LENGTH = MIN_FIELD_LENGTH;
