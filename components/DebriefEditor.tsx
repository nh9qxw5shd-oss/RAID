'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, Send, Trash2, Loader2 } from 'lucide-react';
import { notifyDebriefPublished } from '@/lib/notifications';
import RealitySection from './sections/RealitySection';
import ActionsInactionsSection from './sections/ActionsInactionsSection';
import DirectivesSection from './sections/DirectivesSection';
import IlrReviewSection from './sections/IlrReviewSection';
import ConfirmModal from './ConfirmModal';
import { Debrief, Point, Directive, IlrReview, emptyIlrReview } from '@/lib/types';
import { updateDebrief, publishDebrief, deleteDebrief } from '@/lib/store';
import { fmtRelative } from '@/lib/format';

type ModalState = 'none' | 'publish' | 'delete';

export default function DebriefEditor({ initial }: { initial: Debrief }) {
  const router = useRouter();
  const [d, setD] = useState<Debrief>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initial.updated_at);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [modal, setModal] = useState<ModalState>('none');
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave
  useEffect(() => {
    if (!dirty.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const updated = await updateDebrief(d.id, {
        ref: d.ref,
        title: d.title,
        incident_date: d.incident_date,
        incident_time: d.incident_time,
        incident_type: d.incident_type,
        location: d.location,
        summary: d.summary,
        content: d.content,
        author: d.author,
        organisation: d.organisation,
      });
      setSaving(false);
      if (updated) setSavedAt(updated.updated_at);
      dirty.current = false;
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [d]);

  const patch = (p: Partial<Debrief>) => {
    dirty.current = true;
    setD((prev) => ({ ...prev, ...p }));
  };
  const setContent = (key: 'actions' | 'inactions', rows: Point[]) =>
    patch({ content: { ...d.content, [key]: rows } });
  const setDirectives = (rows: Directive[]) =>
    patch({ content: { ...d.content, directives: rows } });
  const setIlrReview = (ilrReview: IlrReview) =>
    patch({ content: { ...d.content, ilrReview } });

  const doPublish = async () => {
    setModal('none');
    setPublishing(true);
    await updateDebrief(d.id, {
      ref: d.ref, title: d.title, incident_date: d.incident_date, incident_time: d.incident_time,
      incident_type: d.incident_type, location: d.location, summary: d.summary,
      content: d.content, author: d.author, organisation: d.organisation,
    });
    await publishDebrief(d.id);
    setPublishing(false);
    setPublished(true);
    notifyDebriefPublished(d.title, d.id);
    setTimeout(() => router.push('/'), 2500);
  };

  const doDelete = async () => {
    setModal('none');
    await deleteDebrief(d.id);
    router.push('/');
  };

  if (published) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.35)' }}
        >
          <CheckCircle2 size={32} className="text-[var(--nr-green)]" />
        </div>
        <div className="text-center">
          <h2 className="serif mb-2 text-[28px] text-[var(--ink-100)]">Debrief Published</h2>
          <p className="font-mono text-[13px] text-[var(--ink-500)]">Returning to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Confirm modals */}
      <ConfirmModal
        open={modal === 'publish'}
        title="Publish debrief?"
        message="This will move the debrief to the published section where recipients can view it and post responses to directives."
        confirmLabel="Publish"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={doPublish}
        onCancel={() => setModal('none')}
      />
      <ConfirmModal
        open={modal === 'delete'}
        title="Delete draft permanently?"
        message="This action cannot be undone. All content in this draft will be lost."
        confirmLabel="Delete"
        cancelLabel="Keep draft"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setModal('none')}
      />

      {/* Top bar */}
      <div className="no-print mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn btn-ghost">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span className="font-mono text-[12px] text-[var(--ink-500)]">progress is saved automatically</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-[var(--ink-500)]">
            {saving ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Saving…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check size={12} /> Saved {fmtRelative(savedAt)}
              </span>
            )}
          </span>
          <button className="btn btn-ghost btn-danger" onClick={() => setModal('delete')}>
            <Trash2 size={13} /> Delete
          </button>
          <button className="btn btn-primary" onClick={() => setModal('publish')} disabled={publishing}>
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publish
          </button>
        </div>
      </div>

      {/* Author attribution */}
      <div className="card mb-3 grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        <div>
          <label className="label-micro mb-1.5 block">Lead / Author</label>
          <input
            className="input"
            value={d.author}
            onChange={(e) => patch({ author: e.target.value })}
            placeholder="Name of debrief lead"
          />
        </div>
        <div>
          <label className="label-micro mb-1.5 block">Organisation</label>
          <input
            className="input"
            value={d.organisation}
            onChange={(e) => patch({ organisation: e.target.value })}
            placeholder="e.g. Network Rail — East Midlands"
          />
        </div>
      </div>

      <RealitySection value={d} onChange={patch} />
      <ActionsInactionsSection
        actions={d.content.actions}
        inactions={d.content.inactions}
        onActionsChange={(rows) => setContent('actions', rows)}
        onInactionsChange={(rows) => setContent('inactions', rows)}
      />
      <DirectivesSection blocks={d.content.directives} onChange={setDirectives} />
      <IlrReviewSection
        value={d.content.ilrReview ?? emptyIlrReview()}
        onChange={setIlrReview}
      />
    </div>
  );
}
