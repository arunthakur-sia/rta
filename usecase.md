# RTA Innovation Program — Agent Platform: End-to-End Use Case & Functional Flow

This document walks through **every screen and field** in the app, as one continuous story — from a participant's first login to a scored, closed pitch. It is written from the field level up: for each screen, what each field is, what it accepts, what triggers validation, and what happens when the participant submits it.

> Field labels are quoted exactly as they appear on screen (English; Arabic equivalents exist for every string via the locale switcher). The header currently shows the "SIA Partners" mark alongside an "Innovation / Professional Program" lockup, while the page title and the sign-in screen still read "RTA Innovation Professional Program" — worth flagging as a branding inconsistency to resolve.

---

## 1. Identity model — how sign-in works today

Sign-in is real: an email + password form at the sign-in screen, checked against a stored account. There are still **no self-service sign-ups** — there is exactly **one account type, participant**, and one seeded demo account:

| Seeded name | Seeded email |
|---|---|
| Amina Al Marri | participant@pilot.rta.gov.ae |

The demo password out of the box is **`RtaDemo#2026`** (an administrator can override it; see the README).

**How a session is established:**
1. The **Sign in** screen takes **Email** and **Password** and submits them.
2. The server looks up the account by email and checks the password against what's on file.
3. On a match, the participant is signed in and stays signed in for a week. On a mismatch, the form shows a single generic **"Invalid email or password."** for both a wrong password and an unknown email — the app never hints which one was wrong.
4. **Every screen and every action is gated** — an unauthenticated visitor is redirected straight to sign-in before any page renders (or gets a plain "not signed in" response if they were calling an API directly), and lands back on the page they were headed to once they sign in.
5. **"Sign out,"** in the top bar next to the user's name, ends the session and returns to sign-in.

**There is no role concept left in this build.** Both agents' verdicts (the idea verdict and the pitch readiness verdict) are final automatically as soon as the agent computes them — there is no separate mentor, coach, program office or jury account to confirm, override, or view anything on someone else's behalf. The only access check left is **ownership**: only the person who created an idea or pitch can edit its canvas, upload a deck, or delete it.

> Still true from before: this is **demo/pilot-only identity**, not real SSO. The plan explicitly defers RTA intranet/SSO integration to the pilot; today's sign-in only proves "you know the seeded password," not a real corporate identity.

---

## 2. What a participant can do

| Can do |
|---|
| Create/edit ideas (by hand or by autofilling from an uploaded document or image), run the Idea Validation Agent, answer clarify questions, do weekly follow-up check-ins, create pitches, upload decks, run the Pitch Validation Agent, answer mock-jury questions |
| See their own ideas and pitches, and the agent's final verdict on each, with no separate confirmation step from anyone else |

---

## 3. The story, end to end

We follow **Amina (participant)** taking one idea from a blank canvas to a verdict, then a pitch from upload through readiness scoring. Both agents' verdicts are final the moment they're computed — there is no hand-off to another account at any point in this walkthrough.

### Phase A — Amina logs in and creates an idea

1. Amina opens the app. With no session yet, she's redirected straight to sign-in.
2. She signs in as **participant@pilot.rta.gov.ae** / `RtaDemo#2026` and lands on her **Ideas** workspace.
3. She sees **"Ideas"** — empty state: *"No ideas yet."* — with a **"New idea"** button.
4. She clicks **New idea**, which opens the New Idea form.

**At the top of the form is an optional shortcut: "Autofill from a document (.docx, .pdf, or an image)."** Amina can pick a Word document, a PDF, or a photo/screenshot (.png/.jpg/.webp) of a write-up, and the app reads it and pre-fills as many of the fields below as it can find — while it's working, the button area shows **"Reading document…"**. Autofill never overwrites a field Amina has already typed into, and if the file can't be read the form simply stays blank with a note: *"Couldn't read that file. You can still fill the form by hand."* Either way, everything below remains fully editable.

**Fields on the New Idea form**, in order:

| Field | Type | Required to submit? | Notes |
|---|---|---|---|
| **Idea name** | single-line text input | Yes — submit button is disabled until non-empty | Free text, e.g. "Digital Visitor Badge Kiosk" |
| **Table / Theme** | single-line text input | No hard block at creation, but see completeness gate below | Which program table/theme the idea belongs to |
| **Prioritised challenge** | single-line text input | same | The specific challenge statement being addressed |
| **How it works** | textarea | same | What the proposed intervention actually does |
| **Why it should improve adoption** | textarea | same | The reasoning for why this will work |
| **Today** | textarea | same | The current experience, before the change |
| **Proposed experience** | textarea | same | The experience after the change |
| **Customer communication** | textarea | same | What must change — customer-facing communication |
| **Process or service rules** | textarea | same | What must change — process/policy |
| **Digital capability** | textarea | same | What must change — systems/tech |
| **Operations and ecosystem** | textarea | same | What must change — operations and partners |
| **Key assumptions, risks and dependencies** | textarea | same | Self-identified risks and dependencies |
| **Expected impact (0-5)** | number input | optional, no bar to clear | A self-rated score |
| **Implementation feasibility (0-5)** | number input | optional, no bar to clear | A self-rated score |
| **Team size** | number input, min 1 | defaults to `1` | |
| **Hours/week available** | number input, min 0 | defaults to `5` | |

She clicks **"Create idea."** This creates the idea and takes her straight to the **Idea Workspace** (Overview tab).

> Note: **team skills** is *not* on the creation form — it only appears later, on the editable canvas card inside the workspace (see next step).

### Phase B — Completing the canvas (still Amina, participant)

On the idea's Overview tab, the left column shows the **Idea canvas** card, pre-filled with what she just entered (or autofilled), now editable in place:

- Every field from Phase A, reorganized into sections: the intervention ("How it works," "Why it should improve adoption"), how the experience changes ("Today," "Proposed experience"), what must change (the four sub-fields), the risk field, and the two 0–5 assessment scores.
- Five of these fields — "How it works," "Why it should improve adoption," "Today," "Proposed experience," and "Key assumptions, risks and dependencies" — show a live **✓ / "Needs at least 20 characters"** indicator once Amina starts typing. "Table / Theme" and "Prioritised challenge," and the four "what must change" fields, only need to be non-empty (shown as **✓ / "Required"**). The two 0–5 score fields have no completeness check at all.
- **Team profile** sub-section: **Team size**, **Hours/week available** (numbers), **Skills (comma separated)** input.
- **"Save canvas"** button, which saves whatever is currently in the fields.

**Validation gate:** until every field above clears its bar (20 characters for the five long-form fields, non-empty for the rest, team size at least 1), the right-hand **"Start validation session"** button stays disabled and shows: *"Finish the canvas fields marked above before starting."*

### Phase C — Starting the Idea Validation Agent (Amina)

Once the canvas is complete, the right column shows a **"Ready to validate"** card:
> "Complete the canvas on the left, then start the validation session. The agent will ask up to eight adaptive questions, then produce a scored assessment and verdict."

Amina clicks **"Start validation session."** The button shows a spinner with cycling status text ("Reading your idea canvas… / Checking the evidence pack… / Preparing the first question…") while the agent reads the canvas and prepares its first question — this can take up to a minute since it's a live call to the model.

### Phase D — The Clarify Q&A loop (Amina)

The right column now shows the **Validation session** card — this is a **multi-turn loop, up to 8 questions**:

- A progress bar: *"Question {n} of up to {max}."*
- A dimension chip (one of the five rubric criteria — see §5).
- The question text.
- A collapsible **"Why we ask this"** explanation.
- **Answer** — a required textarea (*"Type your answer…"*), autofocused.
- **"Submit answer"** button, disabled until non-empty.

On submit, the panel shows a "Thinking…" spinner with cycling status ("Reading your answer… / Checking rubric coverage… / Scoring against the five dimensions… / Running the quality critique… / Computing the verdict… / Drafting the prototype plan…") — this can take up to a minute, since the *last* answer triggers the agent's full scoring, critique, verdict, and prototype-plan pass in one go.

This repeats — a new question replaces the old one — until the agent decides it has enough information (max 8 turns) and moves on.

> **Resilience note:** if the page is reloaded mid-session and the in-progress session was interrupted (e.g. by a restart), the UI instead shows **"Session in progress" → "Resume session,"** which safely picks up where it left off without repeating any already-answered question.

### Phase E — Scorecard (Amina views, read-only)

Once the agent finishes scoring and drafts a plan, the right column switches to:
- **Scorecard summary** — verdict badge (`ready_to_prototype` / `refine_and_resubmit` / `pivot`), weighted score, confidence, top reasons.
- A **radar chart** across the five criteria (Problem clarity, User evidence, Value and viability, Feasibility, Novelty and risk awareness).
- Other workspace tabs light up: **"5 pillars"** (per-criterion rating, anchor text, evidence citations, open questions) and **"Plan"** (the prototype plan section).

Amina has one self-service action here: if she's the owner, she can click **re-assess**, which starts a fresh assessment to produce a new version.

### Phase F — The verdict is final (no hand-off)

Unlike an earlier version of this app, there is no mentor account and no confirmation gate: as soon as the agent computes the verdict, it is final. If the verdict is **Ready to prototype**, the agent moves straight into drafting a prototype plan; if it's **Refine and resubmit** or **Pivot**, the idea closes without a plan. Either way the idea is closed in the same step that produced the verdict — nobody else needs to sign in to confirm it.

### Phase G — Prototype plan and weekly check-ins (still Amina)

If the verdict was **"Ready to prototype,"** two things now appear on the idea's Plan tab:
- **Prototype Plan** — the agent's riskiest-assumption framing, a primary + alternative prototype option (rung 1–5, e.g. "clickable mockup" vs "no-code prototype"), tools, build items, effort estimate, and a test protocol with a success threshold.
- **Weekly check-in (follow-up mode)** — a lightweight, ungated loop for ongoing prototype testing:
  - **Update** — a required textarea (*"How is the prototype test going this week?"*).
  - **"Send update"** button.
  - The response renders inline: a progress assessment, an optional **"Riskiest assumption changed"** flag + new framing, and a **recommendation**. No identity change needed — this is participant self-service, repeatable weekly, no cap on turns (unlike clarify/mock-jury).

### Phase H — Creating the pitch (Amina, participant)

Once at least one idea exists, Amina goes to **Pitches** → **New pitch**:

- **"Select the validated idea this pitch is for"** — a dropdown populated from her ideas. If she has none yet, the form shows *"No ideas available yet — validate an idea first."* instead (there's no hard block requiring the idea to have reached "Ready to prototype" first — any of her ideas is selectable).
- **"Create pitch"** button, which takes her straight to the **Pitch Studio** tab.

### Phase I — Uploading the deck (Amina)

On the **Pitch Studio** tab, before any deck exists, she sees an upload panel:

- **File input**, accepting `.pdf` and `.pptx` only — required (the upload button silently no-ops without a file selected).
- **Script or transcript (optional)** — a 4-row textarea for a rehearsal script.
- **"Upload"** button. While in flight, the button reads **"Parsing…"** (real text and speaker-notes extraction, with the true slide order preserved).

### Phase J — Confirm parsed slides (Amina)

Next, a parse-check panel shows every extracted slide (title, body text, word count) plus a total word count and estimated speaking time. Amina's only job here: visually confirm nothing important was dropped, then click **"Looks right — confirm."** No text fields to fill — this is a checkpoint, not a form.

### Phase K — Running the Pitch Validation Agent (Amina)

From any pitch sub-tab, a button offers **"Run agent"** (first run) or **"Re-run (new version)"** (subsequent runs). Clicking it:
1. Scores structure, content, and coherence, then pauses at the first **mock jury** question — or goes straight to **readiness** if mock jury was already completed in a prior run.
2. The button shows: *"Running structure, content, coherence, mock jury and readiness…"*
3. Amina is auto-navigated to the mock-jury screen if a question is pending, otherwise straight to the readiness screen.

No fields to fill for this step — it's a single trigger button. Results land on two read-only tabs Amina can inspect any time:
- **Structure Map** — which slide maps to which pitch-template section (problem/users/validation/prototype/value/ask/team/other), what's missing, suggested reorder.
- **Pitch Studio** with inline **slide comments** — per-slide, per-element (title/body/visual/notes) issues with a quoted excerpt, the issue, a suggested rewrite, and a priority (high/medium/low) — filterable via a **"High priority only"** checkbox.
- **Coherence Report** — claims flagged supported / overstated / changed / unsupported against the idea's canvas and clarify Q&A.

### Phase L — Mock jury (Amina)

The **Mock Jury** tab is a **6-turn self-loop**, one persona-driven question per turn:

- Persona name in the card title (e.g. a rotating jury persona with its own focus area).
- Progress bar (turn number out of the total).
- The question.
- A **countdown timer** (visual only, doesn't block submission).
- **Answer** — required textarea (*"Answer as if you were on stage…"*), autofocused.
- **"Submit answer"** button. While in flight: *"Evaluating your answer…"*.

Below the live question, a **Session log** accumulates every prior turn: the question, Amina's answer, a short evaluation, and — where relevant — a **model answer** for comparison. After the 6th turn, the agent moves on to **readiness**, scores it, and closes the pitch — no further confirmation from anyone else.

### Phase M — Readiness dashboard (Amina, self-service)

The **Readiness** tab shows the computed readiness score, verdict (`ready_for_demo_day` / `rehearse` / `rework`), and a prioritized **action list** (each item links back to the offending slide or jury turn, with a "done" checkbox for Amina's own tracking). A **"Re-run (new version)"** button lets her iterate: fix slides/rehearse, then re-run the whole scoring pass to produce a new version, and the dashboard keeps every prior run for a before/after comparison.

This is the end of the pitch flow in this build: the readiness verdict is final the moment it's computed. There is no coach confirmation step, no Jury Pack, and no Program Office dashboard — those existed only for the mentor/coach/program_office/jury account types, which this build has removed in favor of a single participant account.

---

## 4. Field-level validation summary

| Field / gate | Rule | Shown to the participant as |
|---|---|---|
| Sign-in email + password | both required; must match a stored account | "Sign in" button disabled until both filled; generic "Invalid email or password." on any mismatch (no hint which one was wrong) |
| Any screen or action | must be signed in | redirected to sign-in (or a plain "not signed in" response for a direct API call) |
| Idea canvas: "How it works," "Why it should improve adoption," "Today," "Proposed experience," "Key assumptions, risks and dependencies" | at least 20 characters, trimmed | live ✓ / "Needs at least 20 characters" indicator; blocks "Start validation session" until clear |
| Idea canvas: "Table / Theme," "Prioritised challenge," and the four "what must change" fields | non-empty | live ✓ / "Required" indicator; blocks "Start validation session" until clear |
| Idea canvas: "Expected impact," "Implementation feasibility" | none | no indicator, never blocks |
| Team size | at least 1 | blocks "Start validation session" until clear |
| Idea name | non-empty | disables "Create idea" |
| Autofilled document/image | must be a readable `.docx`, `.pdf`, or image file | shows "Couldn't read that file. You can still fill the form by hand." on failure; never blocks manual entry |
| Clarify answer | non-empty | disables "Submit answer" |
| Follow-up update text | non-empty | disables "Send update" |
| New pitch: idea selection | must select one from the dropdown | required field |
| Deck upload | file required, `.pdf` or `.pptx` only | upload silently no-ops without a file |
| Mock jury answer | non-empty | disables "Submit answer" |

---

## 5. Rubric dimensions referenced throughout the flow

**Idea Validation Agent (5 pillars):** Problem clarity · User evidence · Value and viability · Feasibility · Novelty and risk awareness → verdict is one of **Ready to prototype / Refine and resubmit / Pivot**, final the moment the agent computes it.

**Pitch Validation Agent (7 dimensions):** Narrative clarity · Evidence and traction · Value to RTA · Plan and ask · Delivery and timing · Visual clarity · Q&A resilience → verdict is one of **Ready for Demo Day / Rehearse / Rework**, final the moment the agent computes it.

All ratings and verdicts are computed the same, consistent way every time from the model's per-dimension ratings — the model itself never gets to declare its own final score or verdict.

---

## 6. Process summary (for reference)

- **Idea:** create/autofill canvas → clarify Q&A (up to 8 turns) → scored assessment → verdict → prototype plan (if "Ready to prototype") → closed
- **Pitch:** upload deck → confirm parsed slides → structure/content/coherence scoring → mock jury (6 turns) → readiness verdict → closed

Both flows genuinely pause and wait for the participant to type something (clarify answers, mock-jury answers) — nothing is simulated behind the scenes. Neither flow pauses for a separate reviewer account: both end in "closed" automatically once the agent's verdict is computed.
