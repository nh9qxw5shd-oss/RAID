-- ════════════════════════════════════════════════════════════════════════
--  Migration 002 — add directive_id to debrief_comments
--
--  directive_id is a plain UUID matching the `id` field of a Directive
--  block stored inside the debriefs.content JSONB blob.  Directives are
--  not a separate table, so there is intentionally no FK constraint.
--
--  ILR Stage 1 Review answers are also stored inside content JSONB:
--    content.ilrReview = {
--      q1: { answer, comment },
--      q2: { answer, comment, level, escalated },
--      q3: { answer, comment },
--      q4: { answer, comment, huddleTime, furtherHuddles },
--      q5: { answer, comment }
--    }
-- ════════════════════════════════════════════════════════════════════════

alter table debrief_comments
  add column if not exists directive_id uuid;

create index if not exists debrief_comments_directive_idx
  on debrief_comments (debrief_id, directive_id, created_at);
