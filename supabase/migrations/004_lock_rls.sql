-- ════════════════════════════════════════════════════════════════════════
--  Migration 004 — lock down RLS (cutover)
--
--  BREAKING for pre-API builds of the app: the permissive anon read/write
--  policies from 001 are removed. Apply this at the same time the
--  API-backed build (entity auth + server routes) is deployed.
--
--  After this migration the anon key can only:
--    · read published debriefs
--    · read comments on published debriefs
--  Everything else — all writes, drafts, entities, responses, reactions,
--  the distribution list — is server-only via the service role.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists debriefs_anon_all on debriefs;
drop policy if exists comments_anon_all on debrief_comments;

create policy debriefs_anon_read_published on debriefs
  for select using (status = 'published');

create policy comments_anon_read_published on debrief_comments
  for select using (
    exists (
      select 1 from debriefs d
      where d.id = debrief_comments.debrief_id and d.status = 'published'
    )
  );
