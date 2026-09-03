-- ════════════════════════════════════════════════════════════════════════
--  Migration 003 — multi-entity feedback (additive)
--
--  Safe to run against a live database ahead of the code cutover: it only
--  adds tables and columns. The breaking RLS lockdown is split into
--  migration 004 so it can be applied at the moment the API-backed build
--  is deployed.
--
--  New concepts:
--    entities            The organisations that may sign in (Control, Ops,
--                        Maintenance, EMR, GTR, XC, NT, LNER, Outside
--                        Parties, JPT). Each has a 4-digit passcode stored
--                        as sha256(slug || ':' || code). Only Control is
--                        seeded with a passcode (default 0000 — rotate it
--                        in the UI); other entities cannot sign in until
--                        Control sets theirs.
--    entity_responses    One structured viewpoint per entity per debrief,
--                        stored alongside the Control original, never
--                        merged into it. Writable only via the server API,
--                        which stamps entity_id from the session.
--    point_reactions     One thumb up/down per entity per point (point_id
--                        is the uid of a Point inside debriefs.content or
--                        entity_responses.content — no FK by design).
--    distribution_list   Email recipients notified on publish.
-- ════════════════════════════════════════════════════════════════════════

-- ─── New reference fields on debriefs ───────────────────────────────────
alter table debriefs add column if not exists tda_ref          text;
alter table debriefs add column if not exists minutes_ref      text;
alter table debriefs add column if not exists cancellation_ref text;

-- ─── Entities ───────────────────────────────────────────────────────────
create table if not exists entities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  is_control    boolean not null default false,
  active        boolean not null default true,
  sort_order    int not null default 0,
  passcode_hash text,                -- sha256(slug:code) hex; null = cannot sign in
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists entities_touch on entities;
create trigger entities_touch
  before update on entities
  for each row execute function touch_updated_at();

insert into entities (slug, name, is_control, sort_order, passcode_hash) values
  ('control',         'Control',         true,   0, encode(digest('control:0000', 'sha256'), 'hex')),
  ('ops',             'Ops',             false, 10, null),
  ('maintenance',     'Maintenance',     false, 20, null),
  ('emr',             'EMR',             false, 30, null),
  ('gtr',             'GTR',             false, 40, null),
  ('xc',              'XC',              false, 50, null),
  ('nt',              'NT',              false, 60, null),
  ('lner',            'LNER',            false, 70, null),
  ('outside-parties', 'Outside Parties', false, 80, null),
  ('jpt',             'JPT',             false, 90, null)
on conflict (slug) do nothing;

-- ─── Entity stamp on comments ───────────────────────────────────────────
alter table debrief_comments add column if not exists entity_id   uuid references entities (id),
                             add column if not exists entity_name text;

-- ─── Entity responses (one viewpoint per entity per debrief) ────────────
create table if not exists entity_responses (
  id           uuid primary key default gen_random_uuid(),
  debrief_id   uuid not null references debriefs (id) on delete cascade,
  entity_id    uuid not null references entities (id),
  content      jsonb not null default '{}'::jsonb,  -- { actions, inactions, narrative }
  status       text  not null default 'draft',      -- 'draft' | 'submitted'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  submitted_at timestamptz,
  unique (debrief_id, entity_id)
);

create index if not exists entity_responses_debrief_idx on entity_responses (debrief_id);

drop trigger if exists entity_responses_touch on entity_responses;
create trigger entity_responses_touch
  before update on entity_responses
  for each row execute function touch_updated_at();

-- ─── Point reactions (one vote per entity per point) ────────────────────
create table if not exists point_reactions (
  id         uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references debriefs (id) on delete cascade,
  point_id   uuid not null,          -- Point.id inside content JSONB; no FK by design
  entity_id  uuid not null references entities (id),
  reaction   text not null check (reaction in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (point_id, entity_id)
);

create index if not exists point_reactions_debrief_idx on point_reactions (debrief_id);

-- ─── Distribution list (publish notices) ────────────────────────────────
create table if not exists distribution_list (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null unique,
  entity_id  uuid references entities (id),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── RLS: new tables are locked from the start ──────────────────────────
-- No anon policies at all — every read/write goes through the server API,
-- which uses the service role (bypasses RLS) and stamps entity identity
-- from the signed session cookie.
alter table entities          enable row level security;
alter table entity_responses  enable row level security;
alter table point_reactions   enable row level security;
alter table distribution_list enable row level security;
