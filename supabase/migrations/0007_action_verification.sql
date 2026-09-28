-- Re-running the pitch agent against the same deck was producing noisy,
-- non-deterministic score drift with no signal that anything had actually
-- changed. A re-run now requires a freshly uploaded deck (deck_version must
-- have advanced past the version the current run scored), and prioritised
-- actions the participant marked done are checked against the new deck and
-- recorded as resolved/unresolved rather than just trusted.

alter table pitches add column if not exists deck_version integer not null default 1;

alter table pitch_runs add column if not exists deck_version integer;
update pitch_runs set deck_version = 1 where deck_version is null;
alter table pitch_runs alter column deck_version set not null;
alter table pitch_runs alter column deck_version set default 1;

alter table pitch_runs add column if not exists resolved_actions jsonb;
