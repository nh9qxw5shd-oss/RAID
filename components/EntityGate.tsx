'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Entity } from '@/lib/types';
import { listEntities } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Entity sign-in: pick your organisation, enter its shared 4-digit
 * passcode. In local mode (no backend) passcodes cannot be enforced, so
 * the code field is hidden and selection is taken on trust.
 */
export default function EntityGate({
  controlOnly = false,
  title,
  subtitle,
  onSignedIn,
}: {
  /** Restrict the picker to the Control entity (control-side pages). */
  controlOnly?: boolean;
  title?: string;
  subtitle?: string;
  onSignedIn?: () => void;
}) {
  const { login, serverMode } = useSession();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntities()
      .then((all) => {
        const usable = all.filter((e) => e.active && (!controlOnly || e.is_control));
        setEntities(usable);
        if (usable.length === 1) setSelected(usable[0]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load organisations.'))
      .finally(() => setLoading(false));
  }, [controlOnly]);

  const canSubmit = useMemo(
    () => !!selected && (!serverMode || /^\d{4}$/.test(passcode)),
    [selected, serverMode, passcode],
  );

  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(selected.slug, passcode);
      onSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setPasscode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card tick-corners mx-auto max-w-xl p-7">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded"
          style={{ background: 'var(--nr-orange-glow)', color: 'var(--nr-orange)' }}
        >
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--ink-100)]">
            {title || (controlOnly ? 'Control sign-in' : 'Sign in as your organisation')}
          </h2>
          <p className="font-mono text-[12px] text-[var(--ink-500)]">
            {subtitle ||
              (serverMode
                ? 'Select your organisation and enter its 4-digit passcode.'
                : 'Local mode — passcodes are not enforced without a backend.')}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-500)]">
          <Loader2 size={14} className="animate-spin" /> Loading organisations…
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entities.map((e) => (
              <button
                key={e.slug}
                type="button"
                onClick={() => {
                  setSelected(e);
                  setError(null);
                }}
                className="rounded border px-3 py-2.5 text-left text-[14px] transition"
                style={
                  selected?.slug === e.slug
                    ? {
                        borderColor: 'var(--nr-orange)',
                        background: 'var(--nr-orange-glow)',
                        color: 'var(--ink-100)',
                      }
                    : {
                        borderColor: 'var(--line)',
                        background: 'var(--bg-panel)',
                        color: 'var(--ink-300)',
                      }
                }
              >
                <span className="block font-medium">{e.name}</span>
                {serverMode && !e.has_passcode && (
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-[var(--ink-500)]">
                    No passcode set
                  </span>
                )}
              </button>
            ))}
          </div>

          {serverMode && (
            <div className="mb-4">
              <label className="label-micro mb-1.5 block">4-digit passcode</label>
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="shrink-0 text-[var(--ink-500)]" />
                <input
                  className="input input-mono w-32 text-center text-[18px] tracking-[0.4em]"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSubmit) submit();
                  }}
                  placeholder="••••"
                  disabled={!selected}
                />
              </div>
              {selected && !selected.has_passcode && (
                <p className="mt-2 font-mono text-[12px] text-[var(--ink-500)]">
                  {selected.name} has no passcode yet — ask Control to set one.
                </p>
              )}
            </div>
          )}

          {error && <p className="mb-3 font-mono text-[13px] text-[var(--nr-red)]">{error}</p>}

          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit || busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            {selected ? `Continue as ${selected.name}` : 'Continue'}
          </button>
        </>
      )}
    </div>
  );
}
