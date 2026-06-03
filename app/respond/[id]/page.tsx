'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Debrief } from '@/lib/types';
import { getDebrief } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import CommentThread from '@/components/CommentThread';
import DirectiveThread from '@/components/DirectiveThread';

export default function RespondDebriefPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!id) return;
    getDebrief(id).then((d) => {
      // Only published debriefs are open to stakeholder commentary.
      if (d && d.status === 'published') {
        setDebrief(d);
        setState('ready');
      } else {
        setState('missing');
      }
    });
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-32 font-mono text-[14px] text-[var(--ink-500)]">
        <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
      </div>
    );
  }

  if (state === 'missing' || !debrief) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="serif mb-3 text-[28px] text-[var(--ink-100)]">
          Incident not available
        </h1>
        <p className="mb-6 text-[15px] text-[var(--ink-400)]">
          This incident isn&apos;t published for commentary, or the link is no
          longer valid.
        </p>
        <Link href="/respond" className="btn btn-ghost">
          View open incidents
        </Link>
      </div>
    );
  }

  const d = debrief;
  const directives = d.content.directives.filter(
    (b) => b.to || b.questions.some((q) => q.text),
  );

  const meta = [
    ['Ref', d.ref || '—'],
    ['Type', d.incident_type || '—'],
    ['Date', d.incident_date ? `${fmtDate(d.incident_date)} ${d.incident_time}` : '—'],
    ['Location', d.location || '—'],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5">
        <Link href="/respond" className="btn btn-ghost">
          <ArrowLeft size={14} /> All incidents
        </Link>
      </div>

      {/* Read-only context */}
      <article className="card tick-corners p-8">
        <header className="mb-6 border-b border-[var(--line)] pb-5">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-[15px] font-medium uppercase tracking-[0.16em] text-[var(--nr-orange)]">
              RAID Incident Debrief
            </span>
            <span className="pill pill-published">Published</span>
          </div>
          <h1 className="serif mb-2 text-[28px] leading-tight text-[var(--ink-100)]">
            {d.title || 'Untitled incident'}
          </h1>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[13px] text-[var(--ink-400)] sm:grid-cols-4">
            {meta.map(([k, v]) => (
              <div key={k}>
                <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink-500)]">
                  {k}
                </span>
                <span className="text-[var(--ink-300)]">{v}</span>
              </div>
            ))}
          </div>
        </header>

        {d.summary && (
          <section className="mb-6">
            <h2 className="mb-2 text-[16px] font-semibold text-[var(--ink-100)]">
              Reality
            </h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-300)]">
              {d.summary}
            </p>
          </section>
        )}

        {/* Directives — each with its own reply form */}
        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-[var(--ink-100)]">
            Directives
          </h2>
          {directives.length === 0 ? (
            <p className="text-[14px] text-[var(--ink-500)]">
              No directives were issued for this incident. You can still add
              general commentary below.
            </p>
          ) : (
            <div className="space-y-4">
              {directives.map((b) => (
                <div key={b.id} className="border-l-2 border-[var(--line-hi)] pl-4">
                  <div className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ink-400)]">
                    To: <span className="text-[var(--nr-orange)]">{b.to || '—'}</span>
                  </div>
                  <ol className="mb-2 space-y-1">
                    {b.questions
                      .filter((q) => q.text)
                      .map((q, i) => (
                        <li
                          key={q.id}
                          className="flex gap-2 text-[15px] text-[var(--ink-300)]"
                        >
                          <span className="font-mono text-[13px] text-[var(--ink-500)]">
                            Q{i + 1}
                          </span>
                          {q.text}
                        </li>
                      ))}
                  </ol>
                  {b.directive && (
                    <div className="font-mono text-[12px] text-[var(--ink-500)]">
                      ⟶ {b.directive}
                    </div>
                  )}

                  <DirectiveThread
                    debriefId={d.id}
                    directiveId={b.id}
                    debriefTitle={d.title}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </article>

      {/* General commentary */}
      <CommentThread debriefId={d.id} debriefTitle={d.title} />
    </div>
  );
}
