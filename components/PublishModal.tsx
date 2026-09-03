'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Loader2, Mail, Send } from 'lucide-react';
import { Recipient } from '@/lib/types';
import { listRecipients } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Publish confirmation with the emailed-notice recipient selection. Active
 * distribution-list recipients are pre-ticked; the list itself is managed
 * in Settings. Publishing proceeds even if no one is ticked (no email).
 */
export default function PublishModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (recipientIds: string[]) => void;
  onCancel: () => void;
}) {
  const { serverMode } = useSession();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listRecipients()
      .then((all) => {
        const active = all.filter((r) => r.active);
        setRecipients(active);
        setSelected(new Set(active.map((r) => r.id)));
      })
      .catch(() => setRecipients([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(7,11,22,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      <div
        className="card tick-corners w-full max-w-md p-6 shadow-2xl"
        style={{ background: 'var(--bg-card-hi)', border: '1px solid var(--line-hi)' }}
      >
        <div className="mb-4 flex items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded"
            style={{
              background: 'var(--nr-orange-glow)',
              border: '1px solid rgba(224,82,6,0.3)',
              color: 'var(--nr-orange)',
            }}
          >
            <Send size={15} />
          </span>
          <div>
            <h2 id="publish-modal-title" className="text-[15px] font-semibold text-[var(--ink-100)]">
              Publish debrief?
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-400)]">
              The debrief becomes read-only and open for stakeholder viewpoints,
              reactions, and commentary. Ticked recipients are emailed the
              report with the respond link.
            </p>
          </div>
        </div>

        <div className="mb-4 max-h-56 overflow-y-auto rounded border border-[var(--line)] bg-[var(--bg-panel)] p-3">
          {loading ? (
            <p className="flex items-center gap-2 font-mono text-[12px] text-[var(--ink-500)]">
              <Loader2 size={13} className="animate-spin" /> Loading distribution list…
            </p>
          ) : recipients.length === 0 ? (
            <p className="font-mono text-[12px] leading-relaxed text-[var(--ink-500)]">
              {serverMode
                ? 'The distribution list is empty — publish will not email anyone. Add recipients in Settings.'
                : 'Local mode — publish emails are only sent when a backend is configured.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recipients.map((r) => (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--ink-200)]">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                    <Mail size={12} className="shrink-0 text-[var(--ink-500)]" />
                    <span className="min-w-0 flex-1 truncate">
                      {r.name ? `${r.name} — ` : ''}
                      <span className="font-mono text-[12px] text-[var(--ink-400)]">{r.email}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="font-mono text-[12px] text-[var(--ink-500)]">
            {selected.size} of {recipients.length} recipients selected
          </span>
          <Link href="/settings" className="font-mono text-[12px] text-[var(--nr-orange)] hover:underline">
            Edit list
          </Link>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn"
            style={{ background: 'var(--nr-orange)', borderColor: 'var(--nr-orange)', color: '#fff' }}
            onClick={() => onConfirm(Array.from(selected))}
          >
            Publish{selected.size > 0 ? ` & email ${selected.size}` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
