'use client';

import { AlertTriangle, CheckCircle2, MailX } from 'lucide-react';
import { PublishEmailResult } from '@/lib/types';

/**
 * Publish-notice outcome. A failed or partial send is a loud banner — the
 * debrief is published either way, so a missed email is otherwise silent
 * to the stakeholders who were meant to receive it.
 */
export default function EmailOutcome({
  result,
  when,
  className = '',
}: {
  result: PublishEmailResult;
  when?: string;
  className?: string;
}) {
  const { attempted, sent, pdfAttached, error } = result;
  const suffix = when ? ` · ${when}` : '';

  if (error) {
    const partial = sent > 0;
    const colour = partial ? 'var(--nr-orange)' : 'var(--nr-red)';
    return (
      <div
        className={`rounded border px-4 py-3 text-left ${className}`}
        style={{ borderColor: colour, background: partial ? 'var(--nr-orange-glow)' : 'rgba(231,76,60,0.12)' }}
        role="alert"
      >
        <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: colour }}>
          {partial ? <AlertTriangle size={15} /> : <MailX size={15} />}
          {partial
            ? `Email PARTIALLY sent — ${sent} of ${attempted} recipients notified${suffix}`
            : `Email NOT sent — no recipients were notified${suffix}`}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-300)]">
          The debrief is published, but stakeholders have not all been told. Resend the notice
          from the published debrief once the cause is cleared.
        </p>
        <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-[var(--ink-500)]">{error}</p>
      </div>
    );
  }

  if (attempted === 0) {
    return (
      <p className={`font-mono text-[13px] text-[var(--ink-500)] ${className}`}>
        No email notice sent — no recipients selected{suffix}.
      </p>
    );
  }

  return (
    <p className={`flex items-center gap-2 font-mono text-[13px] text-[var(--ink-400)] ${className}`}>
      <CheckCircle2 size={13} className="shrink-0 text-[var(--nr-green)]" />
      Emailed {sent} recipient{sent === 1 ? '' : 's'}
      {pdfAttached ? ' with the report PDF attached' : ' (link only — PDF render unavailable)'}
      {suffix}
    </p>
  );
}
