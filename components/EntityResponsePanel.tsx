'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Send, X } from 'lucide-react';
import { EntityResponse, EntityResponseContent, Point, emptyResponseContent } from '@/lib/types';
import { saveMyResponse } from '@/lib/store';
import { uid, fmtDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';

/**
 * The signed-in entity's own viewpoint on a published debrief: what worked,
 * what didn't, and a narrative — mirroring the RAID shape. Autosaves as a
 * draft; an explicit Submit makes it part of the published record (visible
 * to everyone and included in the PDF). It stays editable by its own
 * entity afterwards; nobody else can touch it.
 */
export default function EntityResponsePanel({
  debriefId,
  initial,
  onSaved,
}: {
  debriefId: string;
  initial: EntityResponse | null;
  onSaved: (r: EntityResponse) => void;
}) {
  const { session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<EntityResponseContent>(
    initial?.content ?? emptyResponseContent(),
  );
  const [status, setStatus] = useState<EntityResponse['status']>(initial?.status ?? 'draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(initial?.submitted_at ?? null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial) {
      setContent(initial.content);
      setStatus(initial.status);
      setSubmittedAt(initial.submitted_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  // Debounced autosave of drafts (and live corrections after submission)
  useEffect(() => {
    if (!dirty.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const r = await saveMyResponse(debriefId, content, false);
        onSaved(r);
        setStatus(r.status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.');
      } finally {
        setSaving(false);
        dirty.current = false;
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const patch = (p: Partial<EntityResponseContent>) => {
    dirty.current = true;
    setContent((prev) => ({ ...prev, ...p }));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await saveMyResponse(debriefId, content, true);
      onSaved(r);
      setStatus(r.status);
      setSubmittedAt(r.submitted_at);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) return null;

  const submitted = status === 'submitted';
  const hasAnything =
    content.narrative.trim() ||
    content.actions.some((p) => p.text.trim()) ||
    content.inactions.some((p) => p.text.trim());

  return (
    <section className="card tick-corners mt-3">
      <button
        className="flex w-full items-center gap-2.5 border-b border-[var(--line)] px-5 py-3 text-left"
        style={{ background: 'linear-gradient(180deg, var(--bg-card-hi), var(--bg-card))' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded font-mono text-[13px] font-medium"
          style={{ background: 'var(--nr-orange-glow)', color: 'var(--nr-orange)' }}
        >
          V
        </span>
        <span className="flex-1 text-[15px] font-semibold">
          {session.name} viewpoint
        </span>
        {submitted ? (
          <span className="pill pill-published">Submitted</span>
        ) : hasAnything ? (
          <span className="pill pill-draft">Draft</span>
        ) : null}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="p-5">
          <p className="mb-4 font-mono text-[12px] leading-relaxed text-[var(--ink-500)]">
            Your organisation&rsquo;s view of this incident, stored alongside the
            Control original — never merged into it. Drafts save automatically
            and stay private to {session.name} until submitted.
            {submitted && submittedAt && (
              <> Submitted {fmtDateTime(submittedAt)} — further edits update the published viewpoint.</>
            )}
          </p>

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <PointEditor
              label="A — Actions"
              hint="what worked, from your viewpoint"
              color="var(--nr-green)"
              rows={content.actions}
              onChange={(rows) => patch({ actions: rows })}
              placeholder="What worked well…"
            />
            <PointEditor
              label="I — Inactions"
              hint="gaps and improvement areas"
              color="var(--nr-red)"
              rows={content.inactions}
              onChange={(rows) => patch({ inactions: rows })}
              placeholder="What was missed or could improve…"
            />
          </div>

          <label className="label-micro mb-1.5 block">Narrative</label>
          <textarea
            className="textarea mb-3"
            rows={4}
            value={content.narrative}
            onChange={(e) => patch({ narrative: e.target.value })}
            placeholder="Your organisation's account and overall view of the incident…"
          />

          {error && <p className="mb-3 font-mono text-[13px] text-[var(--nr-red)]">{error}</p>}

          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] text-[var(--ink-500)]">
              {saving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Saving…
                </span>
              ) : savedFlash ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--nr-green)]">
                  <Check size={12} /> Viewpoint submitted
                </span>
              ) : (
                'Saved automatically'
              )}
            </span>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting || !hasAnything}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitted ? 'Update submitted viewpoint' : 'Submit viewpoint'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function PointEditor({
  label,
  hint,
  color,
  rows,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  color: string;
  rows: Point[];
  onChange: (rows: Point[]) => void;
  placeholder: string;
}) {
  const add = () => onChange([...rows, { id: uid(), text: '' }]);
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const update = (id: string, text: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, text } : r)));

  return (
    <div className="rounded border border-[var(--line)] bg-[var(--bg-panel)] p-4">
      <div
        className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.16em]"
        style={{ color }}
      >
        {label}
        <span className="font-sans text-[12px] normal-case tracking-normal text-[var(--ink-500)]">
          {hint}
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="mb-2 flex items-center gap-2">
          <input
            className="input"
            value={row.text}
            onChange={(e) => update(row.id, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="btn btn-ghost btn-danger !px-2.5"
            onClick={() => remove(row.id)}
            aria-label="Remove"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost mt-1" onClick={add}>
        <Plus size={13} /> Add
      </button>
    </div>
  );
}
