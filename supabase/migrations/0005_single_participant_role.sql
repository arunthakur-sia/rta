-- Collapses the account model down to a single account type
-- (participant) and removes the mentor-review / coach-review human
-- gates: the Idea Validation Agent's verdict and the Pitch Validation
-- Agent's readiness verdict are now both final automatically, and the
-- Jury Pack / Program Office dashboard (which existed only for the
-- retired mentor/coach/program_office/jury roles) are gone with them.

drop table if exists idea_mentor_reviews;
drop table if exists pitch_coach_reviews;

alter table ideas drop column if exists mentor_id;
alter table pitches drop column if exists coach_id;

delete from users where role <> 'participant';

alter table users drop constraint if exists users_role_check;
alter table users drop column if exists role;
