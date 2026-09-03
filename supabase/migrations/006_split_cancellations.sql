-- ════════════════════════════════════════════════════════════════════════
--  Migration 006 — split cancellations into Full / Part
--
--  The single `cancellation_ref` field is replaced by two separate counts:
--  full and part cancellations. `minutes_ref` is retained (now surfaced as
--  "Total Minutes" in the UI). The old `cancellation_ref` column is left in
--  place, unused, to avoid disturbing any rows already written.
-- ════════════════════════════════════════════════════════════════════════

alter table debriefs add column if not exists full_cancellations text;
alter table debriefs add column if not exists part_cancellations text;

-- Carry any existing single value over to Full Cancellations as a best effort.
update debriefs
set full_cancellations = cancellation_ref
where full_cancellations is null
  and cancellation_ref is not null
  and cancellation_ref <> '';
