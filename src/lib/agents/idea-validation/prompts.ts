import { ideaValidationRubric } from "@/lib/skills/ideaValidationRubric";
import { prototypeCatalogue } from "@/lib/skills/prototypeCatalogue";
import { sampleClarifyingQuestions } from "@/lib/skills/clarifyingQuestions";
import type { Idea } from "@/lib/types/domain";

// Appendix B, "Role and boundaries": shared by every stage call for Agent 1.
export function roleAndBoundaries(locale: "en" | "ar"): string {
  return `You are the RTA Idea Validation Agent, a coach for participants in the RTA Innovation Professional Program.

What you do: run a structured challenge session on a submitted idea, rate it against a fixed rubric with written anchors, compute a final verdict, and recommend the cheapest digital or no-code prototype that would test the riskiest assumption.

What you do not do: you never estimate budgets. You never compare one team's idea against another's.

Every claim you make must be anchored to something the participant actually submitted (a canvas field, a clarification answer, an evidence item) or to a cited source. If you don't have real web search results attached to this conversation, do not invent citations, statistics, market sizes or competitor names — state the claim as an assumption to verify instead. This build has no live web search tool wired up; treat every market or competitor claim as unverifiable and label it as an assumption.

Reply in ${locale === "ar" ? "Arabic" : "English"} — the participant is writing in this language for this session. Keep the same language for the whole session.

Tone: direct, specific, encouraging. Every critical point should be paired with what a stronger answer would contain.

Formatting: write free-text fields as clean markdown — **bold** for emphasis, numbered or bulleted lists for multiple points, short paragraphs. Never use an em dash or en dash (— or –); use a period, comma, or "and" instead.`;
}

// Appendix B, "Skills": the rubric anchors and RTA priorities, loaded on
// demand and marked as a stable, cacheable block (see lib/llm/structured.ts).
export function ideaSkillsBlock(): string {
  const rubricText = ideaValidationRubric
    .map(
      (d) =>
        `- ${d.name} (weight ${Math.round(d.weight * 100)}%): rating 1 = "${d.rating1Anchor}"; rating 5 = "${d.rating5Anchor}"`
    )
    .join("\n");
  const catalogueText = prototypeCatalogue
    .map(
      (r) =>
        `Rung ${r.rung} — ${r.type} (tools: ${r.typicalTools.join(", ")}; tests: ${r.tests}; effort: ${r.effortTeamDays.min}-${r.effortTeamDays.max} team-days)`
    )
    .join("\n");
  const sampleQuestions = sampleClarifyingQuestions.map((q) => `- [${q.dimension}] ${q.question}`).join("\n");

  return `## RTA validation rubric (five dimensions, written anchors)
${rubricText}

## Prototype fidelity ladder (work down from rung 1; stop at the first rung that tests the riskiest assumption; never recommend building the full solution)
${catalogueText}

## Sample clarifying questions (adapt, do not read verbatim; ask only what is not already covered)
${sampleQuestions}`;
}

export function ideaRecordContext(idea: Idea): string {
  const evidenceText = idea.evidence.length
    ? idea.evidence.map((e) => `- [id: ${e.id}] [${e.kind}] ${e.content}${e.url ? ` (${e.url})` : ""}`).join("\n")
    : "(none submitted)";
  const clarificationsText = idea.clarifications.length
    ? idea.clarifications
        .filter((c) => c.answer)
        .map((c) => `- [id: ${c.id}] Q (${c.dimension ?? "general"}): ${c.question}\n  A: ${c.answer}`)
        .join("\n")
    : "(none yet)";

  // Every canvas line is tagged with its exact field key in brackets
  // (e.g. [canvas.howItWorks]) so a citation can literally copy it —
  // without this, evidence.source citations are unresolvable back to a
  // real record, since the model has no other way to know the true id/key.
  return `## Idea canvas
Idea name: ${idea.title}
Table / theme [canvas.tableTheme]: ${idea.canvas.tableTheme}
Prioritised challenge [canvas.prioritisedChallenge]: ${idea.canvas.prioritisedChallenge}
How it works [canvas.howItWorks]: ${idea.canvas.howItWorks}
Why it should improve adoption [canvas.whyItImprovesAdoption]: ${idea.canvas.whyItImprovesAdoption}
Current experience (today) [canvas.currentExperience]: ${idea.canvas.currentExperience}
Proposed experience [canvas.proposedExperience]: ${idea.canvas.proposedExperience}
What must change — customer communication [canvas.whatMustChange.customerCommunication]: ${idea.canvas.whatMustChange.customerCommunication}
What must change — process or service rules [canvas.whatMustChange.processOrServiceRules]: ${idea.canvas.whatMustChange.processOrServiceRules}
What must change — digital capability [canvas.whatMustChange.digitalCapability]: ${idea.canvas.whatMustChange.digitalCapability}
What must change — operations and ecosystem [canvas.whatMustChange.operationsAndEcosystem]: ${idea.canvas.whatMustChange.operationsAndEcosystem}
Key assumptions, risks and dependencies [canvas.assumptionsRisksDependencies]: ${idea.canvas.assumptionsRisksDependencies}
Table assessment — expected impact: ${idea.canvas.expectedImpact ?? "(not scored)"} / 5
Table assessment — implementation feasibility: ${idea.canvas.implementationFeasibility ?? "(not scored)"} / 5

## Team profile
Size: ${idea.team.size}; skills: ${idea.team.skills.join(", ") || "(unspecified)"}; hours/week available: ${idea.team.hoursPerWeek}

## Evidence pack (cite as "evidence.<id>" using the exact id shown in brackets)
${evidenceText}

## Clarifications answered so far (cite as "clarification.<id>" using the exact id shown in brackets)
${clarificationsText}`;
}
