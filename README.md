# RTA Innovation Program — Agent Platform

A Next.js implementation of the two coaching agents described in *TEC Innovation Program – AI Agent Build-out Plan* (the original planning document; the program's client is now RTA — see "Branding" below):

- **Agent 1 — Idea Validation Agent**, with prototype suggestion (program phase 3)
- **Agent 2 — Pitch Validation Agent** (program phase 6)

Both agents share one architecture: a LangGraph state machine per agent, Claude Opus 4.6 (on Amazon Bedrock, via an OpenAI-compatible gateway — see below) for the model calls, a fixed rubric with deterministic scoring in application code, and a bilingual (English/Arabic, RTL) Next.js interface. See the source document for the full design rationale — this README covers what's built and how to run it.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in Supabase + LLM gateway credentials
```

### Database (Supabase)

The app's data layer (every idea, assessment, prototype plan, pitch run, mock jury turn, and audit log entry) lives in Postgres via Supabase (`src/lib/supabase/client.ts`, `src/lib/db/queries/*.ts`). Set these in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your project's Settings > API page
- `SUPABASE_SERVICE_ROLE_KEY` — same page. Server-only: never exposed to the browser, and the only key the app actually uses (see below)

**Before first run, apply the schema** — `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_add_password_auth.sql` (adds the `password_hash` column sign-in uses), then `supabase/migrations/0003_cascade_pitches_on_idea_delete.sql` (lets deleting an idea also delete its pitches), then `supabase/migrations/0004_partial_pitch_runs.sql` (lets a pitch run be visible before readiness/verdict are computed), then `supabase/migrations/0005_single_participant_role.sql` (collapses the account model to a single participant type and drops the mentor-review/coach-review tables and columns), then `supabase/migrations/0006_token_usage.sql` (adds `users.is_admin` and the `token_usage` table the admin dashboard reads). This project's sandbox only had the API keys, not a database password or a Supabase personal access token, so migrations can't be applied automatically here; run them yourself, in order:

- Easiest: paste each file's contents into your project's SQL Editor (Supabase dashboard) and run it, or
- With the CLI: `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>`, then `npx supabase db push`

The app never talks to Supabase from the browser — every table's Row Level Security policy locks it to the `service_role`, and all access goes through Next.js server code using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. That's also why only the service role key needs to be real for the app to work; the anon key is there for completeness/future browser use.

### Session signing

Also set `SESSION_SECRET` in `.env.local` — the HMAC key sign-in cookies are signed with (`src/lib/auth/sessionToken.ts`), so they can't be hand-edited into someone else's account. Generate one with:

```bash
openssl rand -base64 32
```

```bash
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`. There is only one participant-facing account type — participant — and the app seeds a single demo account into the `users` table on first run: **participant@pilot.rta.gov.ae**, password **`RtaDemo#2026`** (override with `DEMO_ACCOUNT_PASSWORD` in `.env.local` before first run if you want a different one). Sign-in is real (email + password, checked server-side against a hashed password, session cookie signed and `httpOnly`) — but there's still no self-service sign-up and no real SSO.

The app also seeds one admin account — **admin@pilot.rta.gov.ae**, password **`RtaAdmin#2026`** (override with `ADMIN_ACCOUNT_PASSWORD`). It's a normal signed-in account with `users.is_admin = true`; the only thing it unlocks is `/admin`, a token-usage dashboard (every LLM call the Idea/Pitch Validation agents make is logged to the `token_usage` table — see `lib/llm/structured.ts` and `lib/db/queries/tokenUsage.ts` — and rolled up there per participant, per idea, and per pitch/slide deck).

**Note:** the participant seed account is only inserted the first time the `users` table is empty; the admin account is seeded independently (by email) so it appears even on a database that already had participants. If this Supabase project already has the older, multi-role demo accounts seeded, apply `supabase/migrations/0005_single_participant_role.sql` to drop the retired roles and their tables, then `supabase/migrations/0006_token_usage.sql` for `is_admin` and `token_usage`.

### LLM gateway credentials

Model calls go through an OpenAI-compatible gateway (a LiteLLM proxy) rather than calling Bedrock or Anthropic's API directly — `LLM_GATEWAY_API_KEY` and `LLM_GATEWAY_BASE_URL` in `.env.local`. This project's key is scoped to one model alias, `bedrock-opus-4.6` (Claude Opus 4.6 on Bedrock, behind the gateway), used for both the "capable" and "fast" model roles the plan calls for — see `lib/llm/models.ts` for how to add a second, quicker alias once one is available.

Confirmed directly against the gateway before wiring it into the app: chat completions, and `json_schema` structured outputs (`lib/llm/structured.ts` uses the OpenAI SDK's `zodResponseFormat` + `.chat.completions.parse()`, same "structured in, structured out" contract as before).

Nothing is hardcoded — every route that calls the model checks credentials first and returns a clean `503 llm_not_configured` error (surfaced in the UI) instead of crashing if the key is missing. If you swap in a different OpenAI-compatible provider, only `.env.local` needs to change.

Observed against this key: single calls took 8–40s and it's capped at 60 requests/minute with a $20 budget (returned in the gateway's response headers). The assess→critique→verdict→prototype_plan sequence in Agent 1 makes several calls back to back in one request, so budget for it to take a while — the UI's "this can take up to a minute" messaging in `ClarifySessionPanel`/`RunAgentButton` already assumes this.

**Structured-output schema constraints, found by running every stage live against this gateway** (it routes to Bedrock's own native structured outputs, which are considerably stricter than plain OpenAI `json_schema` mode — all of `lib/schemas/*.ts` already works around these, documented in comments at each spot, but worth knowing before adding new schemas):
- Every object property must be in `required` — `z.optional()` gets rejected outright; use `.nullable()` for "may not have a value."
- Array `minItems` may only be `0` or `1` — `.length(n)` or `.min(n)` for `n > 1` is rejected. `maxItems` is rejected at *any* value, including via `.max(n)`.
- Integer `minimum`/`maximum` are rejected outright — and zod's `.int()` adds them automatically (JS's safe-integer range) even with no explicit `.min()/.max()` call. Use plain `z.number()`, not `.int()`.
- Net effect: ranges and exact counts (e.g. "rate all five dimensions," "1-5") are enforced by the prompt instruction and a `.describe()` hint, not by the JSON schema — `lib/scoring/*.ts` clamps ratings to 1-5 defensively before using them, since the schema can no longer guarantee that range.

**Two more things a live run surfaced:**
- A response that hits `maxTokens` mid-JSON throws `LengthFinishReasonError` rather than returning a parseable (if truncated) result — `lib/llm/structured.ts` now detects this specifically and retries once at double the token budget, instead of the generic "fix your schema" retry message, which doesn't help a truncation. The mock jury evaluation call in particular needed its budget raised from 512 to 1536 tokens — an `evaluation` plus a full `modelAnswer` in one JSON payload doesn't reliably fit in 512.
- The pitch agent's coherence check needs the idea's full clarification Q&A, not just the canvas summary — most of the specific numbers a pitch deck cites (user counts, percentages, cost math) live in clarification answers, not canvas fields. Without them, the coherence stage has nothing to verify most claims against and defaults to flagging them "unsupported." Fixed in `ideaRecordSummary` (`lib/agents/pitch-validation/prompts.ts`). Confirmed live: went from 8 of 17 claims wrongly flagged to 6 of 18 correctly flagged (a real inconsistency in the test deck's numbers, a claim implying an untested result, and a scope-broadening overstatement) — a meaningful precision improvement, not a false-positive suppression.

## Architecture

```
src/
  app/                      Next.js App Router — pages + API route handlers
  components/               UI, split into ui/ (primitives), layout/, idea/, pitch/
  lib/
    agents/
      idea-validation/      Agent 1: LangGraph state machine, prompts, nodes, runner
      pitch-validation/     Agent 2: same shape
    llm/                    OpenAI-compatible gateway client + structured-output helper
    supabase/               Supabase client (service-role, server-only)
    db/queries/             Typed query modules over the Postgres tables
    schemas/                Zod schemas mirroring Appendix A's output schemas
    scoring/                Deterministic weighted-score + verdict logic
    skills/                 Rubrics, prototype catalogue, pitch template, glossary
    i18n/                   EN/AR dictionaries + locale provider
    parsing/                PDF/PPTX deck parsers
```

**Orchestration.** Each agent is a LangGraph `StateGraph` whose nodes match the plan's own named stages (`intake → clarify → assess → critique → verdict → prototype_plan → closed` for Agent 1; the equivalent 8-stage graph for Agent 2). Both agents' verdicts are final automatically — there is no separate mentor/coach account to confirm or override them. The remaining human-in-the-loop points (the clarify Q&A loop, mock jury) use LangGraph's `interrupt()`/`Command(resume)` — the graph genuinely pauses mid-run and resumes from the next HTTP request, not a simulation of it.

The multi-turn loops (`clarify`, `mock_jury`) are graph-level self-loops — one question/turn per node visit, routed back to the same node by a conditional edge — rather than a `while` loop inside one node call. This was a real bug found by running the app live, not a hypothetical: LangGraph replays a paused task's *entire* function body from the top on every resume (only the `interrupt()` calls themselves are memoized, by call order), so a `while` loop with the model call and DB insert placed before `interrupt()` re-runs those side effects on every resume — duplicate questions, duplicate rows, wasted calls. Scoping one question to one task, plus a "reuse an already-pending unanswered question" idempotency check inside the node, makes it replay-safe. See the comment on `clarifyNode` in `lib/agents/idea-validation/nodes.ts` for the full trace of how it broke.

**Reliability.** Per the plan's core design principle, the *model* only ever returns per-dimension ratings and anchors — every weighted score, verdict, and hard rule (e.g. "any dimension rated 1 forces Refine and resubmit") is computed in plain TypeScript (`lib/scoring/`), never by the model. Every structured call is validated against its zod schema again after the model returns (`lib/llm/structured.ts`), with one automatic retry on a schema mismatch. The critique pass (Agent 1) and the coherence stage (Agent 2) are separate model calls specifically to catch unsupported claims before anything reaches the participant.

**Data.** Postgres via Supabase (`supabase/migrations/0001_init.sql`, `lib/db/queries/*.ts`) — versioned rows for every assessment, prototype plan, and pitch run, plus an append-only audit log. This is the durable source of truth; LangGraph's in-memory checkpointer is only a convenience for resuming mid-session within one server process (see the comment in `lib/agents/idea-validation/graph.ts` for the tradeoff and how it degrades — a server restart mid-session falls back to starting a fresh run from the durable Supabase state, not data loss).

## What's fully implemented

- Both agents run live end-to-end against Supabase + the real LLM gateway, not just unit-tested in isolation. Agent 1: intake through five real clarify turns, assess, critique, deterministic verdict, prototype plan. Agent 2: real deck upload/parse, structure, content, coherence, all six real mock-jury turns (persona rotation and turn counting verified correct across the self-loop), readiness — including a mid-run recovery, when a dev-server hot-reload wiped the in-memory checkpoint mid-session, that resumed cleanly from the durable Supabase state without re-asking any already-answered mock jury question, which is exactly the resilience `lib/agents/idea-validation/graph.ts`'s comment describes
- Deterministic scoring/verdict logic and hard rules for both rubrics, exactly as specified
- Real PDF and PPTX parsing (title/body/speaker-notes extraction, true slide order via `presentation.xml`, not filename order)
- All the screens named in the plan: Idea Workspace, Validation Session, Scorecard, Prototype Plan, Pitch Studio, Structure Map, Coherence Report, Mock Jury, Readiness Dashboard
- Bilingual EN/AR with RTL layout, a fixed glossary shared by the UI and the agent prompts, per-session language pinning
- Session/version history, an audit log, and the reliability controls from the plan's table that are implementable in code (state-machine-controlled stages, schema validation, anchored comments, cross-team scoping)

## What's intentionally stubbed or simplified

These are called out in code comments at the relevant spot, not hidden:

- **Web search / citations** — the plan's "web search with citations" tool isn't wired to a real provider. Prompts instead instruct the model to label any market/competitor claim as an unverified assumption. Add a real provider (Tavily, Serper, Bing) as an OpenAI-style tool in `lib/agents/*/nodes.ts` before a pilot — check whether the gateway/model combination supports tool calls first.
- **Slide image descriptions** — the plan calls for descriptions generated from rendered slide images; this build extracts text/notes only. `lib/parsing/deckParser.ts` documents the extension point (render each slide, call the model with `slideDescriptionSchema`).
- **SSO / RTA intranet identity** — the plan explicitly defers this to the pilot. Sign-in today is real (email + password, hashed and checked server-side, signed session cookie via `src/lib/auth/session.ts`), but it's still against a single fixed seeded demo account — there's no self-service sign-up, no password reset, and no RTA-intranet identity behind it yet.
- **Human gate confirmation** — the plan calls for a mentor to confirm the idea verdict and a coach to confirm Demo Day readiness. This build has only the participant account type, so both verdicts are final automatically as soon as the agent computes them; there is no separate reviewer role, Jury Pack, or Program Office dashboard.
- **Evaluation harness** (golden set, calibration, CI regression gate) — not built; the plan scopes this as Stage 0 of the build plan, not something to fabricate.

## Branding

The app is white-labeled under SIA Partners: the accent color scale is keyed off SIA Partners' teal (`#00A2A3`, from sia-partners.com — `--color-accent-*` in `src/app/globals.css`), and the top-nav mark is `src/components/ui/BrandWordmark.tsx`, using the logo at `public/brand/sia-logo.svg`. The program's client is RTA — that's the org name in the app's copy, AI prompts, and validation rubric (`src/lib/skills/*`), separate from SIA Partners' own visual identity above.

## Source document

`TEC Innovation Program - AI Agent Build-out Plan_2.docx` in the repo root is the original spec this was built from (kept under its original filename — the program's client has since become RTA, reflected throughout the app itself).
