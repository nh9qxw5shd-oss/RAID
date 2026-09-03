# Incident Debrief — RAID

A structured, collaborative incident debrief tool. Capture incidents under the
**RAID** framework — **R**eality · **A**ctions · **I**nactions · **D**irectives —
work multiple debriefs in parallel, publish them for review, export a clean PDF
report, and gather structured multi-entity feedback from stakeholders.

Built with Next.js 14 (App Router), Supabase, and Tailwind, in the Insight
design language.

---

## Workflow

1. **Sign in as Control** — control-side pages (dashboard, editor, settings)
   are gated to the Control entity.
2. **Dashboard** — every debrief listed under *Open* (drafts) or *Published*.
3. **Open / resume** any number of drafts. Edits autosave. The Reality section
   captures Incident, TDA, Minutes, and Cancellation references.
4. **Publish** — choose recipients from the distribution list; the debrief
   moves to Published (read-only) and the selected recipients are emailed the
   report PDF with the respond link.
5. **Review** — published debriefs render as a professional report with
   PDF export, entity viewpoints, per-point reactions, and commentary.
6. **Reopen as draft** if further editing is needed.

## Entities & sign-in

Ten organisations are seeded: **Control, Ops, Maintenance, EMR, GTR, XC, NT,
LNER, Outside Parties, JPT**. Each signs in with a shared **4-digit passcode**
— deliberately light auth: it stops casual misrepresentation ("I'll just say
I'm GTR"), it is not personal authentication. Control manages passcodes and
can deactivate entities under **Settings**.

- Passcodes are stored hashed; they can be rotated but never displayed.
- On a fresh install only Control can sign in (default passcode **0000** —
  rotate it immediately). Other entities can't sign in until Control sets
  their codes.
- Sessions are HMAC-signed HttpOnly cookies (12 h). All writes go through
  API routes that stamp entity identity from the session — the browser
  never talks to the database directly, so no entity can post or edit as
  another.

## Respond portal (`/respond`)

The public landing page reached from the report's QR code / emailed link.
Reading a published report requires no sign-in; contributing requires an
entity session. Signed-in stakeholders can:

- **File their entity's viewpoint** — one structured response per entity per
  debrief (own Actions / Inactions / narrative, mirroring the RAID shape),
  stored alongside the Control original and never merged into it. Drafts
  autosave privately; submitting adds the viewpoint to the published report
  and PDF. Entities can only ever edit their own response (server-enforced).
- **React to points** — thumb up/down any Actions/Inactions point (Control's
  or another entity's) to show support or contest it. One vote per entity
  per point, toggleable, displayed as attributable entity names.
- **Answer directives** and **add general commentary** — stamped with the
  posting entity.
- **Download PDF** — regenerate the full report, including viewpoints,
  reactions, and commentary, without going back to Control.

## Publish emails

Publishing emails the report to the **distribution list** (Settings →
Publish distribution list; also selectable per publish). The email carries
the respond link and, when PDF rendering is available, the report PDF —
rendered server-side by headless Chromium against the same `ReportDocument`
as the on-screen export, so all copies are identical. Email failures never
block publishing; the outcome is reported on the publish screen.

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Local mode:** with no Supabase credentials set, the app stores everything in
your browser's `localStorage` so it is fully usable immediately. A *Local mode*
badge appears in the header. Entity sign-in is simulated (there is no server
to enforce passcodes) and publish emails are not sent. Data stays on that one
browser.

---

## Wiring up Supabase (shared, multi-user, persistent)

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (SQL editor, or
   `supabase db push`). 001–003 are additive; **004 locks down RLS** and must
   be applied when deploying this API-backed build (earlier builds wrote
   directly with the anon key and will stop working once 004 is applied).
3. Copy `.env.local.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server-only; powers the API routes
   ```

4. Restart. Sign in as Control (default passcode 0000 — rotate it in
   Settings), set passcodes for the other entities, and add distribution
   recipients.

### Security model

- RLS after migration 004: the anon key can only read published debriefs and
  their comments. Everything else — drafts, all writes, entities, responses,
  reactions, the distribution list — is server-only via the service role.
- Every API write derives the acting entity from the signed session cookie,
  never from the request body.
- A shared 4-digit passcode per organisation is a turnstile, not a lock:
  appropriate for keeping honest stakeholders in their own lane, not for
  adversarial threat models. Rotate codes in Settings if one leaks.

### Publish email setup (optional)

Set `RESEND_API_KEY` (from [Resend](https://resend.com)) and `RESEND_FROM`
(a sender on a domain verified in Resend). Without them, publishing works
but sends no email. PDF attachment uses `@sparticuz/chromium` on Vercel
functions automatically; locally, set `PDF_CHROMIUM_PATH` to a Chromium
binary. If PDF rendering fails the notice degrades to link-only.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel (it auto-detects Next.js).
3. Add the environment variables from `.env.local.example` (the two
   `NEXT_PUBLIC_SUPABASE_*` values, `SUPABASE_SERVICE_ROLE_KEY`, and
   optionally `RESEND_API_KEY` / `RESEND_FROM`).
4. Deploy, and apply migration 004 at the same time.

---

## Project structure

```
app/
  page.tsx                 Dashboard (Control-gated)
  debrief/[id]/page.tsx    Editor (draft) or Review (published)
  settings/page.tsx        Entities & passcodes, distribution list
  respond/                 Public stakeholder portal (entity sign-in to contribute)
  print/[id]/page.tsx      Token-gated print surface for the PDF renderer
  api/                     Route handlers — auth, debriefs, comments,
                           responses, reactions, entities, distribution
components/
  Header, StatusPill, TimePicker, SectionCard, SessionBadge
  EntityGate, ControlGate  Sign-in and control-side gating
  DebriefEditor            Autosaving RAID form
  PublishModal             Publish + recipient selection
  DebriefReview            Published report + PDF export (control side)
  ReportDocument           Shared printable report (control + respond + print)
  EntityResponsePanel      An entity's own viewpoint form
  ReactionBar              Thumb up/down chips per point
  EntityPanel              Passcode management (Settings)
  DistributionPanel        Publish recipients (Settings)
  RespondQr, CommentThread, DirectiveThread, sections/
lib/
  types.ts                 Domain types
  store.ts                 Client data layer (API routes ⇆ localStorage)
  session.tsx              Entity session context
  hydrate.ts               Row → typed-object hydration (client + server)
  server/                  Service-role DB client, cookie/passcode auth,
                           publish email, headless-Chromium PDF
supabase/migrations/       Database schema (001–003 additive, 004 RLS lockdown)
```

---

## Roadmap / next steps

- Realtime updates (Supabase channels) for viewpoints and reactions
- Directive status tracking (open / responded / closed)
- Audit trail and version history on published debriefs
- Review-close workflow (lock viewpoints once the review is concluded)
