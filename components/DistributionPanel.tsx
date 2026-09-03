'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { Recipient } from '@/lib/types';
import { addRecipient, deleteRecipient, listRecipients, updateRecipient } from '@/lib/store';

/**
 * The distribution list emailed when a debrief is published. Editable by
 * Control; the publish dialog offers a per-send selection from the active
 * recipients listed here.
 */
export default function DistributionPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listRecipients()
      .then(setRecipients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  const add = async () => {
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const r = await addRecipient(name.trim(), email.trim());
      setRecipients((prev) =>
        [...prev, r].sort((a, b) => a.email.localeCompare(b.email)),
      );
      setName('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipient.');
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (r: Recipient) => {
    setBusyId(r.id);
    setError(null);
    try {
      const updated = await updateRecipient(r.id, { active: !r.active });
      if (updated) setRecipients((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: Recipient) => {
    setBusyId(r.id);
    setError(null);
    try {
      await deleteRecipient(r.id);
      setRecipients((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card tick-corners">
      <div
        className="flex items-center gap-2.5 border-b border-[var(--line)] px-5 py-3"
        style={{ background: 'linear-gradient(180deg, var(--bg-card-hi), var(--bg-card))' }}
      >
        <Mail size={14} className="text-[var(--nr-orange)]" />
        <h2 className="flex-1 text-[15px] font-semibold">Publish distribution list</h2>
        <span className="font-mono text-[13px] text-[var(--ink-500)]">
          {recipients.filter((r) => r.active).length} active
        </span>
      </div>

      <div className="p-5">
        <p className="mb-4 font-mono text-[12px] leading-relaxed text-[var(--ink-500)]">
          Everyone active on this list is emailed the report (PDF attached, with
          the respond link) when a debrief is published. Recipients can also be
          unticked per publish.
        </p>

        {loading ? (
          <p className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-500)]">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : recipients.length === 0 ? (
          <p className="mb-4 rounded border border-dashed border-[var(--line)] px-4 py-4 text-center font-mono text-[13px] text-[var(--ink-500)]">
            No recipients yet — add the first below.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {recipients.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded border border-[var(--line)] bg-[var(--bg-panel)] px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--ink-100)]">
                    {r.name || r.email}
                  </span>
                  {r.name && (
                    <span className="block truncate font-mono text-[12px] text-[var(--ink-500)]">
                      {r.email}
                    </span>
                  )}
                </div>
                {!r.active && (
                  <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--ink-500)]">
                    Inactive
                  </span>
                )}
                <button
                  className="btn btn-ghost"
                  disabled={busyId === r.id}
                  onClick={() => toggle(r)}
                >
                  {r.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn btn-ghost btn-danger"
                  disabled={busyId === r.id}
                  onClick={() => remove(r)}
                  aria-label={`Remove ${r.email}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_1.4fr_auto]">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
          />
          <input
            className="input input-mono"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder="email@example.com"
          />
          <button className="btn btn-primary" onClick={add} disabled={adding || !email.trim()}>
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>
        {error && <p className="mt-3 font-mono text-[13px] text-[var(--nr-red)]">{error}</p>}
      </div>
    </section>
  );
}
