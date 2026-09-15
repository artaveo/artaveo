-- Migration: 0010_lead_pipeline
-- Roadmap: § 14 "Lead Pipeline"
--
-- `stage`, `priority` and `follow_up_at` already exist (0001_inquiries.sql,
-- 0006_lead_pipeline_and_consultations.sql — that migration's own header
-- said the state machine itself was Phase 14's scope, not its). This
-- migration is that step: the closed stage vocabulary, the enforced
-- transition graph, the `tags` column § 14 also names ("notes, tags,
-- priority, follow-up date, source attribution, link to service/package"
-- — notes are already covered by `inquiry_events.note`, tags are not yet
-- a column), and a closed vocabulary for `inquiry_events.type` (0001's own
-- comment: "Phase 14 will add 'stage-changed', 'note-added', etc. when
-- the pipeline exists" — now).
--
-- Transition enforcement lives in the database (§ 14: "transitions
-- enforced in the database"), not only in application code — a trigger
-- rejects any update that moves `stage` along an edge the graph below
-- doesn't allow, so a mistake in `app/actions/pipeline.ts`, a future
-- caller, or a manual edit in the Supabase dashboard can't silently
-- corrupt the pipeline. Writing the resulting event to `inquiry_events`
-- stays application-side (`app/actions/pipeline.ts`), the same
-- best-effort-after-the-real-write pattern `app/actions/inquiries.ts`
-- already established for `type = 'created'` — this migration only
-- guards validity, it doesn't attempt to infer an `actor` for the audit
-- trail from inside a trigger.
--
-- Transition graph (§ 14's own diagram, plus one deliberate addition):
--   new -> reviewed -> qualified -> contacted -> discovery -> proposal -> won | lost -> archived
--   + any pre-proposal stage can move directly to 'lost' (a lead can go
--     cold or be rejected at any point, not only after a proposal is
--     sent — standard pipeline behaviour the diagram's straight arrow
--     doesn't rule out, since 'lost' already appears as a branch off
--     'proposal').
-- No backward transitions and no self-loop-as-event: moving stage
-- "backwards" to correct a mis-click isn't in this graph and isn't
-- something the roadmap's diagram describes — recorded as known debt in
-- `docs/phases/PHASE-14-README.md` rather than invented here.
--
-- ROLLBACK:
--   drop trigger if exists inquiries_stage_transition_guard on public.inquiries;
--   drop function if exists public.enforce_inquiry_stage_transition();
--   alter table public.inquiries drop constraint if exists inquiries_stage_check;
--   drop index if exists public.inquiries_tags_idx;
--   alter table public.inquiries drop column if exists tags;
--   alter table public.inquiry_events drop constraint if exists inquiry_events_type_check;

alter table public.inquiries
  add constraint inquiries_stage_check
  check (stage in (
    'new', 'reviewed', 'qualified', 'contacted', 'discovery', 'proposal', 'won', 'lost', 'archived'
  ));

alter table public.inquiries
  add column if not exists tags text[] not null default '{}';

create index if not exists inquiries_tags_idx on public.inquiries using gin (tags);

alter table public.inquiry_events
  add constraint inquiry_events_type_check
  check (type in (
    'created', 'stage-changed', 'note-added', 'priority-changed', 'follow-up-set', 'tags-changed'
  ));

create or replace function public.enforce_inquiry_stage_transition()
returns trigger
language plpgsql
as $$
begin
  -- Not a stage change (only other columns touched, e.g. a note or a
  -- priority edit issued alongside an unrelated update) — always allowed.
  if new.stage = old.stage then
    return new;
  end if;

  if not (
    (old.stage = 'new' and new.stage = 'reviewed')
    or (old.stage = 'reviewed' and new.stage = 'qualified')
    or (old.stage = 'qualified' and new.stage = 'contacted')
    or (old.stage = 'contacted' and new.stage = 'discovery')
    or (old.stage = 'discovery' and new.stage = 'proposal')
    or (old.stage = 'proposal' and new.stage in ('won', 'lost'))
    or (
      old.stage in ('new', 'reviewed', 'qualified', 'contacted', 'discovery', 'proposal')
      and new.stage = 'lost'
    )
    or (old.stage in ('won', 'lost') and new.stage = 'archived')
  ) then
    raise exception 'invalid inquiry stage transition: % -> %', old.stage, new.stage
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists inquiries_stage_transition_guard on public.inquiries;
create trigger inquiries_stage_transition_guard
  before update of stage on public.inquiries
  for each row
  execute function public.enforce_inquiry_stage_transition();
