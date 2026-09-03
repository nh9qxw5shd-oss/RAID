'use client';

import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Users } from 'lucide-react';
import { Entity } from '@/lib/types';
import { listEntities, setEntityActive, setEntityPasscode } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Control-only management of the organisations that can sign in: set or
 * rotate each entity's shared 4-digit passcode and toggle it active.
 * Passcodes are stored hashed, so an existing code can never be displayed
 * — only replaced.
 */
export default function EntityPanel() {
  const { serverMode } = useSession();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // slug
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // slug
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    listEntities()
      .then(setEntities)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  const patchLocal = (e: Entity) =>
    setEntities((prev) => prev.map((x) => (x.slug === e.slug ? e : x)));

  const savePasscode = async (slug: string) => {
    if (!/^\d{4}$/.test(code)) return;
    setBusy(slug);
    setError(null);
    try {
      patchLocal(await setEntityPasscode(slug, code));
      setEditing(null);
      setCode('');
      setSavedSlug(slug);
      setTimeout(() => setSavedSlug((s) => (s === slug ? null : s)), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set passcode.');
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (e: Entity) => {
    setBusy(e.slug);
    setError(null);
    try {
      patchLocal(await setEntityActive(e.slug, !e.active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card tick-corners">
      <div
        className="flex items-center gap-2.5 border-b border-[var(--line)] px-5 py-3"
        style={{ background: 'linear-gradient(180deg, var(--bg-card-hi), var(--bg-card))' }}
      >
        <Users size={14} className="text-[var(--nr-orange)]" />
        <h2 className="flex-1 text-[15px] font-semibold">Organisations &amp; passcodes</h2>
      </div>

      <div className="p-5">
        {!serverMode && (
          <p className="mb-4 rounded border border-dashed border-[var(--line)] px-4 py-3 font-mono text-[12px] text-[var(--ink-500)]">
            Local mode — passcodes are only enforced when a backend is configured.
          </p>
        )}
        {loading ? (
          <p className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-500)]">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : (
          <ul className="space-y-2">
            {entities.map((e) => (
              <li
                key={e.slug}
                className="flex flex-wrap items-center gap-3 rounded border border-[var(--line)] bg-[var(--bg-panel)] px-4 py-2.5"
              >
                <span className="min-w-[10rem] text-[14px] font-medium text-[var(--ink-100)]">
                  {e.name}
                  {e.is_control && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-[var(--nr-orange)]">
                      Control
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--ink-500)]">
                  {e.has_passcode ? 'Passcode set' : 'No passcode — cannot sign in'}
                </span>

                <span className="ml-auto flex items-center gap-2">
                  {savedSlug === e.slug && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--nr-green)]">
                      <Check size={12} /> Saved
                    </span>
                  )}
                  {editing === e.slug ? (
                    <>
                      <input
                        className="input input-mono w-24 text-center tracking-[0.3em]"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        value={code}
                        onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 4))}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') savePasscode(e.slug);
                          if (ev.key === 'Escape') {
                            setEditing(null);
                            setCode('');
                          }
                        }}
                        placeholder="0000"
                      />
                      <button
                        className="btn btn-primary"
                        disabled={!/^\d{4}$/.test(code) || busy === e.slug}
                        onClick={() => savePasscode(e.slug)}
                      >
                        {busy === e.slug ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditing(null);
                          setCode('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      disabled={!serverMode || busy === e.slug}
                      onClick={() => {
                        setEditing(e.slug);
                        setCode('');
                      }}
                    >
                      <KeyRound size={13} /> {e.has_passcode ? 'Rotate passcode' : 'Set passcode'}
                    </button>
                  )}
                  {!e.is_control && (
                    <button
                      className="btn btn-ghost"
                      disabled={!serverMode || busy === e.slug}
                      onClick={() => toggleActive(e)}
                      title={e.active ? 'Prevent this organisation from signing in' : 'Re-enable sign-in'}
                    >
                      {e.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 font-mono text-[13px] text-[var(--nr-red)]">{error}</p>}
        <p className="mt-4 font-mono text-[12px] leading-relaxed text-[var(--ink-500)]">
          Passcodes are shared per organisation — a light gate against
          misrepresentation, not personal authentication. Rotate a code here if
          it leaks. Control&rsquo;s default passcode is 0000 on a fresh install:
          rotate it before inviting anyone else in.
        </p>
      </div>
    </section>
  );
}
