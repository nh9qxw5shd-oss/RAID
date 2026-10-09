-- ════════════════════════════════════════════════════════════════════════
--  Migration 007 — publish notice audit log
--
--  One row per attempt to email a debrief's publish notice (the initial
--  publish, and any later "Resend notice" from Control). Gives Control a
--  record of whether the distribution list was actually emailed, and the
--  reason when it was not.
--
--  Server-only — RLS on with no policies, same as distribution_list.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists publish_notices (
  id            uuid primary key default gen_random_uuid(),
  debrief_id    uuid not null references debriefs (id) on delete cascade,
  kind          text not null default 'publish' check (kind in ('publish', 'resend')),
  attempted     integer not null default 0,
  sent          integer not null default 0,
  pdf_attached  boolean not null default false,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists publish_notices_debrief_idx
  on publish_notices (debrief_id, created_at desc);

alter table publish_notices enable row level security;
