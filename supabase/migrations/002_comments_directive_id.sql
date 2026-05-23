-- ════════════════════════════════════════════════════════════════════════
--  Migration 002 — add directive_id to debrief_comments
--
--  The application code references directive_id on debrief_comments to
--  thread responses against a specific Directive block.  This column was
--  missing from the initial schema.
--
--  ILR Stage 1 Review answers are stored inside the `content` JSONB on the
--  debriefs row (no separate table required).  The JSONB structure is:
--    content.ilrReview = {
--      q1: { answer, comment },
--      q2: { answer, comment, level, escalated },
--      q3: { answer, comment },
--      q4: { answer, comment, huddleTime, furtherHuddles },
--      q5: { answer, comment }
--    }
-- ════════════════════════════════════════════════════════════════════════

alter table debrief_comments
  add column if not exists directive_id uuid references debriefs (id) on delete cascade;

-- Index for efficient per-directive comment lookups
create index if not exists debrief_comments_directive_idx
  on debrief_comments (debrief_id, directive_id, created_at);
