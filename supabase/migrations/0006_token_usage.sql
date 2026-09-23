-- Token usage tracking: every LLM call made through lib/llm/structured.ts
-- can be attributed to the user who triggered it, and (where applicable)
-- the idea or pitch/slide-deck it was working on. Backs the admin usage
-- dashboard (see lib/db/queries/tokenUsage.ts and app/admin/page.tsx).
--
-- Also reintroduces a minimal admin flag on users — not the full role
-- enum removed in 0005 (participant/mentor/coach/program_office/jury),
-- just a boolean for "can see the usage dashboard". Nothing about the
-- participant flow (verdicts, review gates) depends on it.

alter table users add column if not exists is_admin boolean not null default false;

create table if not exists token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  pitch_id uuid references pitches(id) on delete set null,
  stage text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_token_usage_user on token_usage(user_id);
create index if not exists idx_token_usage_idea on token_usage(idea_id);
create index if not exists idx_token_usage_pitch on token_usage(pitch_id);

alter table token_usage enable row level security;
drop policy if exists service_role_only on token_usage;
create policy service_role_only on token_usage for all to service_role using (true) with check (true);
