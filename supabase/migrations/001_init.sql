-- ════════════════════════════════════════════════════════════════════════
--  Incident Debrief — initial schema
--  RAID structure (Reality · Actions · Inactions · Directives) stored as
--  metadata columns + a JSONB `content` blob. Comments are a separate table
--  so onwards commentary can be added to published debriefs independently.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Debriefs ───────────────────────────────────────────────────────────
create table if not exists debriefs (
  id              uuid primary key default gen_random_uuid(),
  ref             text,
  title           text,
  incident_date   date,
  incident_time   text,
  incident_type   text,
  location        text,
  summary         text,                       -- short factual narrative (Reality)
  content         jsonb not null default '{}'::jsonb,  -- { actions, inactions, directives }
  status          text  not null default 'draft',      -- 'draft' | 'published'
  author          text,
  organisation    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

create index if not exists debriefs_status_idx      on debriefs (status);
create index if not exists debriefs_updated_at_idx   on debriefs (updated_at desc);

-- ─── Comments (onwards commentary) ──────────────────────────────────────
create table if not exists debrief_comments (
  id           uuid primary key default gen_random_uuid(),
  debrief_id   uuid not null references debriefs (id) on delete cascade,
  author       text not null default 'Anonymous',
  organisation text,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists debrief_comments_debrief_idx on debrief_comments (debrief_id, created_at);

-- ─── Auto-update updated_at ─────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists debriefs_touch on debriefs;
create trigger debriefs_touch
  before update on debriefs
  for each row execute function touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════
--  Row Level Security
--  NOTE: These MVP policies allow anonymous read/write so the tool works
--  immediately with the anon key. BEFORE exposing to external stakeholders,
--  introduce Supabase Auth and tighten these to authenticated roles.
-- ════════════════════════════════════════════════════════════════════════
alter table debriefs         enable row level security;
alter table debrief_comments enable row level security;

drop policy if exists debriefs_anon_all on debriefs;
create policy debriefs_anon_all on debriefs
  for all using (true) with check (true);

drop policy if exists comments_anon_all on debrief_comments;
create policy comments_anon_all on debrief_comments
  for all using (true) with check (true);
