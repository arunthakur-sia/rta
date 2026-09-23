import { pitchRubric, pitchTemplateSections, demoDayDefaultFormat, speakingWordsPerMinute } from "@/lib/skills/pitchRubric";
import { templateSectionLabels, label } from "@/lib/skills/glossary";
import type { Idea, IdeaAssessment, Pitch, PrototypePlan } from "@/lib/types/domain";

export function roleAndBoundaries(locale: "en" | "ar"): string {
  return `You are the RTA Pitch Validation Agent, a coach preparing teams in the RTA Innovation Professional Program for Demo Day.

What you do: critique deck structure and content slide by slide, check the pitch is consistent with what was actually validated and built, run a mock jury, and produce a final readiness score and verdict.

What you do not do: you never rank teams against each other and you never predict what the real jury will decide.

Every comment must be anchored to a specific slide and a quoted element. This build has no live web search tool — never invent statistics, market data or competitor names.

Reply in ${locale === "ar" ? "Arabic" : "English"}. Keep the same language for the whole session.

Tone: direct, specific, encouraging. Every critical point should be paired with a concrete rewrite or next step.

Formatting: write free-text fields as clean markdown — **bold** for emphasis, numbered or bulleted lists for multiple points, short paragraphs. Never use an em dash or en dash (— or –); use a period, comma, or "and" instead.`;
}

export function pitchSkillsBlock(locale: "en" | "ar"): string {
  const rubricText = pitchRubric
    .map((d) => `- ${d.name} (weight ${Math.round(d.weight * 100)}%): looks for "${d.whatTheAgentLooksFor}"`)
    .join("\n");
  const templateText = pitchTemplateSections.map((s) => `- ${s}: ${label(templateSectionLabels[s], locale)}`).join("\n");

  return `## RTA pitch rubric (seven dimensions)
${rubricText}

## RTA pitch template sections (map every slide to exactly one)
${templateText}

## Demo Day format
Time limit: ${demoDayDefaultFormat.timeLimitMinutes} minutes. Jury: ${demoDayDefaultFormat.juryComposition.join(", ")}. Question time: ${demoDayDefaultFormat.questionTimeSeconds}s per question.
Speaking pace reference: ${speakingWordsPerMinute} words per minute.`;
}

export function deckContext(pitch: Pitch): string {
  const slidesText = pitch.slides
    .map(
      (s) =>
        `Slide ${s.index + 1} (${s.wordCount} words${s.imageDescription ? `, image: ${s.imageDescription}` : ""}):\nTitle: ${s.title}\nBody: ${s.body}${s.notes ? `\nNotes: ${s.notes}` : ""}`
    )
    .join("\n\n");
  return `## Deck (${pitch.slides.length} slides)\n${slidesText}${pitch.script ? `\n\n## Script/transcript\n${pitch.script}` : ""}`;
}

export function ideaRecordSummary(idea: Idea, assessment: IdeaAssessment | null, plan: PrototypePlan | null): string {
  // Includes the clarification Q&A and evidence pack, not just the canvas
  // summary — the coherence stage checks deck claims against this record,
  // and most of the specific numbers a pitch deck cites (user counts,
  // percentages, cost math) come from clarification answers, not the
  // canvas fields. Without them the coherence check has nothing to verify
  // most claims against and flags everything "unsupported" by default —
  // found by running this stage live against a deck that accurately
  // summarized real clarification answers.
  const clarificationsText = idea.clarifications
    .filter((c) => c.answer)
    .map((c) => `- Q: ${c.question}\n  A: ${c.answer}`)
    .join("\n");
  const evidenceText = idea.evidence.map((e) => `- [${e.kind}] ${e.content}`).join("\n");

  return `## Validated idea record (from Agent 1)
Prioritised challenge: ${idea.canvas.prioritisedChallenge}
How it works: ${idea.canvas.howItWorks}
Why it should improve adoption: ${idea.canvas.whyItImprovesAdoption}
Current experience (today): ${idea.canvas.currentExperience}
Proposed experience: ${idea.canvas.proposedExperience}
Key assumptions, risks and dependencies: ${idea.canvas.assumptionsRisksDependencies}
${assessment ? `Verdict: ${assessment.verdict} (score ${assessment.weightedScore})\nTop reasons: ${assessment.topReasons.join("; ")}` : "(no assessment on file)"}
${plan ? `Prototype tested: ${plan.primary.type} — riskiest assumption: ${plan.riskiestAssumption}\nTest protocol: ${plan.primary.test.protocol}, threshold: ${plan.primary.test.successThreshold}` : "(no prototype plan on file)"}

## Clarification answers (the source for most specific numbers a pitch deck will cite)
${clarificationsText || "(none)"}

## Evidence pack
${evidenceText || "(none)"}`;
}
