-- ════════════════════════════════════════════════════════════════════════
--  Migration 005 — store the 4-digit passcode in plaintext
--
--  Control needs to be able to read an entity's passcode to advise its
--  stakeholders, so the code is now stored in a `passcode` column and
--  surfaced to Control-only sessions. These are shared, low-security
--  turnstile codes: a sha256 over a 4-digit space is trivially reversible,
--  so the hash never provided real protection. `passcode_hash` is retained
--  for login verification continuity; PATCH writes both together.
-- ════════════════════════════════════════════════════════════════════════

alter table entities add column if not exists passcode text;

-- Backfill existing codes by matching each stored hash against the full
-- 4-digit space (sha256(slug:code) — see lib/server/auth.hashPasscode).
update entities e
set passcode = c.code
from (select lpad(g::text, 4, '0') as code from generate_series(0, 9999) g) c
where e.passcode is null
  and e.passcode_hash is not null
  and e.passcode_hash = encode(digest(e.slug || ':' || c.code, 'sha256'), 'hex');
