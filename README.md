# Incident Debrief — RAID

A structured, collaborative incident debrief tool. Capture incidents under the
**RAID** framework — **R**eality · **A**ctions · **I**nactions · **D**irectives —
work multiple debriefs in parallel, publish them for review, export a clean PDF
report, and gather onwards commentary from stakeholders.

Built with Next.js 14 (App Router), Supabase, and Tailwind, in the Insight
design language.

---

## Workflow

1. **Dashboard** — every debrief listed under *Open* (drafts) or *Published*.
2. **Open / resume** any number of drafts. Edits autosave.
3. **Publish** — a debrief moves into the Published section, read-only.
4. **Review** — published debriefs render as a professional report with:
   - **Download PDF** (browser print-to-PDF against a clean document layout)
   - **Commentary** — threaded onwards comments from any stakeholder.
5. **Reopen as draft** if further editing is needed.

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Local mode:** with no Supabase credentials set, the app stores everything in
your browser's `localStorage` so it is fully usable immediately. A *Local mode*
badge appears in the header. Data stays on that one browser.

---

## Wiring up Supabase (shared, multi-user, persistent)

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/001_init.sql` (SQL editor, or
   `supabase db push`).
3. Copy `.env.local.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Restart. The *Local mode* badge disappears and data is now shared across
   everyone hitting the same backend.

> **Security note.** The MVP migration ships permissive Row Level Security
> policies (anon can read/write) so the tool works out of the box. **Before
> exposing this to external stakeholders, add Supabase Auth and tighten the RLS
> policies** to authenticated roles. See the comment block in the migration.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel (it auto-detects Next.js).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel
   project settings.
4. Deploy.

---

## Project structure

```
app/
  page.tsx                 Dashboard (Open / Published)
  debrief/[id]/page.tsx    Editor (draft) or Review (published)
  layout.tsx, globals.css  Shell + Insight design tokens
components/
  Header, StatusPill, TimePicker, SectionCard
  DebriefEditor            Autosaving RAID form
  DebriefReview            Published report + PDF export
  CommentThread            Onwards commentary
  sections/                Reality · Actions/Inactions · Directives
lib/
  types.ts                 Domain types
  supabase.ts              Lazy client (graceful degradation)
  store.ts                 Data layer (Supabase ⇆ localStorage)
  format.ts                Date / id helpers
supabase/migrations/       Database schema
```

---

## Roadmap / next steps

- Supabase Auth + tightened RLS (required before external exposure)
- Server-side PDF rendering (Puppeteer on a Vercel function) for pixel-perfect,
  headless report generation
- Realtime comment updates (Supabase channels)
- Directive status tracking (open / responded / closed)
- Audit trail and version history on published debriefs
