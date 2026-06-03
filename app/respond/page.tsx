'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Loader2 } from 'lucide-react';
import { Debrief } from '@/lib/types';
import { listPublishedDebriefs } from '@/lib/store';
import { fmtDate } from '@/lib/format';

export default function RespondIndexPage() {
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublishedDebriefs()
      .then(setDebriefs)
      .catch(() => setDebriefs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <p className="label-micro mb-1">Stakeholder commentary</p>
        <h1 className="serif text-[32px] leading-tight text-[var(--ink-100)]">
          Respond to a published incident
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--ink-400)]">
          Select an incident below to read its directives, answer a directive
          question, or add general commentary. No account is required.
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 font-mono text-[14px] text-[var(--ink-500)]">
          <Loader2 size={15} className="animate-spin" /> Loading incidents…
        </p>
      ) : debriefs.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--line)] px-5 py-12 text-center font-mono text-[13px] text-[var(--ink-500)]">
          No published incidents are open for commentary right now.
        </div>
      ) : (
        <div className="space-y-2.5">
          {debriefs.map((d) => (
            <Link
              key={d.id}
              href={`/respond/${d.id}`}
              className="card tick-corners block px-5 py-4 transition hover:translate-x-0.5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} className="shrink-0 text-[var(--ink-400)]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate text-[16px] font-semibold text-[var(--ink-100)]">
                        {d.title || 'Untitled incident'}
                      </span>
                      {d.ref && (
                        <span className="shrink-0 font-mono text-[12px] text-[var(--ink-500)]">
                          {d.ref}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 font-mono text-[12px] text-[var(--ink-500)]">
                      {d.incident_type && <span>{d.incident_type}</span>}
                      {d.location && <span className="truncate">· {d.location}</span>}
                      {d.incident_date && <span>· {fmtDate(d.incident_date)}</span>}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--ink-500)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
