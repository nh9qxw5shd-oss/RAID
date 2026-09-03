'use client';

import { useMemo } from 'react';
import { Comment, Debrief, EntityResponse, IlrAnswer, IlrReview, Point, Reaction } from '@/lib/types';
import { fmtDate, fmtDateTime } from '@/lib/format';
import DirectiveThread from './DirectiveThread';
import ReactionBar from './ReactionBar';
import RespondQr from './RespondQr';

/**
 * The printable RAID report. This is the single source of truth for the
 * report layout and the print/PDF surface, shared by the control-side review
 * page and the public Respond portal so both generate identical PDFs.
 *
 * `comments` drives the print-only response blocks; pass `onCommentAdded` so
 * that responses posted on screen are folded into the printed copy without a
 * page reload — letting anyone regenerate an up-to-date PDF.
 */
export default function ReportDocument({
  debrief: d,
  comments,
  responses = [],
  reactions = [],
  onCommentAdded,
  onReactionsChanged,
}: {
  debrief: Debrief;
  comments: Comment[];
  /** Entity viewpoints — only submitted ones are rendered. */
  responses?: EntityResponse[];
  /** Thumb up/down votes across all points of the debrief. */
  reactions?: Reaction[];
  onCommentAdded?: (c: Comment) => void;
  onReactionsChanged?: (all: Reaction[]) => void;
}) {
  const submittedResponses = useMemo(
    () => responses.filter((r) => r.status === 'submitted'),
    [responses],
  );
  const repliesByDirective = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      if (c.directive_id) {
        const existing = map.get(c.directive_id) ?? [];
        map.set(c.directive_id, [...existing, c]);
      }
    }
    return map;
  }, [comments]);

  const generalComments = useMemo(
    () => comments.filter((c) => !c.directive_id),
    [comments],
  );

  const meta = [
    ['Ref', d.ref || '—'],
    ['Type', d.incident_type || '—'],
    ['Date', d.incident_date ? `${fmtDate(d.incident_date)} ${d.incident_time}` : '—'],
    ['Location', d.location || '—'],
  ] as const;

  const refsMeta = [
    ['TDA Ref', d.tda_ref],
    ['Minutes Ref', d.minutes_ref],
    ['Cancellation Ref', d.cancellation_ref],
  ].filter(([, v]) => v) as Array<[string, string]>;

  return (
    <article className="report-document card tick-corners p-8">
      <header className="rd-rule mb-6 border-b border-[var(--line)] pb-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="rd-accent font-mono text-[15px] font-medium uppercase tracking-[0.16em] text-[var(--nr-orange)]">
            RAID Incident Debrief
          </span>
          <span className="pill pill-published">Published</span>
        </div>
        <h1 className="serif mb-2 text-[28px] leading-tight text-[var(--ink-100)]">
          {d.title || 'Untitled incident'}
        </h1>
        <div className="rd-muted grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[13px] text-[var(--ink-400)] sm:grid-cols-4">
          {meta.map(([k, v]) => (
            <div key={k}>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink-500)]">{k}</span>
              <span className="text-[var(--ink-300)]">{v}</span>
            </div>
          ))}
        </div>
        {refsMeta.length > 0 && (
          <div className="rd-muted mt-2 grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[13px] text-[var(--ink-400)] sm:grid-cols-4">
            {refsMeta.map(([k, v]) => (
              <div key={k}>
                <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink-500)]">{k}</span>
                <span className="text-[var(--ink-300)]">{v}</span>
              </div>
            ))}
          </div>
        )}
        {(d.author || d.organisation) && (
          <div className="rd-muted mt-3 font-mono text-[12px] text-[var(--ink-500)]">
            Lead: {d.author || '—'}
            {d.organisation && ` · ${d.organisation}`}
            {d.published_at && ` · Published ${fmtDateTime(d.published_at)}`}
          </div>
        )}
      </header>

      {/* R */}
      {d.summary && (
        <Block letter="R" title="Reality">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-300)]">
            {d.summary}
          </p>
        </Block>
      )}

      {/* A */}
      <Block letter="A" title="Actions" accent="var(--nr-green)">
        <PointList
          debriefId={d.id}
          points={d.content.actions}
          reactions={reactions}
          onReactionsChanged={onReactionsChanged}
          empty="No actions recorded."
        />
      </Block>

      {/* I */}
      <Block letter="I" title="Inactions" accent="var(--nr-red)">
        <PointList
          debriefId={d.id}
          points={d.content.inactions}
          reactions={reactions}
          onReactionsChanged={onReactionsChanged}
          empty="No inactions recorded."
        />
      </Block>

      {/* D */}
      <Block letter="D" title="Directives">
        {d.content.directives.filter((b) => b.to || b.questions.some((q) => q.text)).length === 0 ? (
          <p className="rd-muted text-[14px] text-[var(--ink-500)]">No directives issued.</p>
        ) : (
          <div className="space-y-4">
            {d.content.directives
              .filter((b) => b.to || b.questions.some((q) => q.text))
              .map((b) => {
                const replies = repliesByDirective.get(b.id) ?? [];
                return (
                  <div key={b.id} className="rd-rule border-l-2 border-[var(--line-hi)] pl-4">
                    <div className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ink-400)]">
                      To: <span className="rd-accent text-[var(--nr-orange)]">{b.to || '—'}</span>
                    </div>
                    <ol className="mb-2 space-y-1">
                      {b.questions
                        .filter((q) => q.text)
                        .map((q, i) => (
                          <li key={q.id} className="flex gap-2 text-[15px] text-[var(--ink-300)]">
                            <span className="font-mono text-[13px] text-[var(--ink-500)]">Q{i + 1}</span>
                            {q.text}
                          </li>
                        ))}
                    </ol>

                    {/* Screen: interactive reply thread */}
                    <DirectiveThread
                      debriefId={d.id}
                      directiveId={b.id}
                      debriefTitle={d.title}
                      onCommentAdded={onCommentAdded}
                    />

                    {/* Print-only: static reply list */}
                    {replies.length > 0 && (
                      <div className="print-only mt-2 space-y-2">
                        <div className="print-reply-meta font-mono text-[11px] uppercase tracking-wide">
                          Responses ({replies.length})
                        </div>
                        {replies.map((c) => (
                          <div key={c.id} className="print-reply">
                            <div className="print-reply-meta">
                              {c.author}{c.organisation ? ` · ${c.organisation}` : ''} &nbsp;·&nbsp; {fmtDateTime(c.created_at)}
                            </div>
                            <div className="print-reply-body">{c.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Block>

      {/* ILR Stage 1 Review */}
      {d.content.ilrReview && <IlrReviewBlock review={d.content.ilrReview} />}

      {/* Entity viewpoints — stored alongside the Control original */}
      {submittedResponses.length > 0 && (
        <Block letter="V" title="Entity Viewpoints">
          <div className="space-y-5">
            {submittedResponses.map((r) => (
              <div key={r.id} className="rd-rule border-l-2 border-[var(--line-hi)] pl-4">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="rd-accent font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--nr-orange)]">
                    {r.entity_name}
                  </span>
                  {r.submitted_at && (
                    <span className="rd-muted shrink-0 font-mono text-[11px] text-[var(--ink-500)]">
                      Submitted {fmtDateTime(r.submitted_at)}
                    </span>
                  )}
                </div>
                {r.content.narrative.trim() && (
                  <p className="mb-2.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--ink-300)]">
                    {r.content.narrative}
                  </p>
                )}
                {r.content.actions.some((p) => p.text.trim()) && (
                  <ViewpointPoints
                    label="Actions — what worked"
                    color="var(--nr-green)"
                    points={r.content.actions}
                    debriefId={d.id}
                    reactions={reactions}
                    onReactionsChanged={onReactionsChanged}
                  />
                )}
                {r.content.inactions.some((p) => p.text.trim()) && (
                  <ViewpointPoints
                    label="Inactions — gaps"
                    color="var(--nr-red)"
                    points={r.content.inactions}
                    debriefId={d.id}
                    reactions={reactions}
                    onReactionsChanged={onReactionsChanged}
                  />
                )}
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* Print-only: general comments */}
      {generalComments.length > 0 && (
        <div className="print-only">
          <div className="mb-3 flex items-center gap-2.5 border-t border-[var(--line)] pt-5">
            <span
              className="rd-accent flex h-6 w-6 items-center justify-center rounded font-mono text-[14px] font-medium"
              style={{ background: 'var(--nr-orange-glow)', color: 'var(--nr-orange)' }}
            >
              C
            </span>
            <h2 className="text-[16px] font-semibold text-[var(--ink-100)]">General Commentary</h2>
          </div>
          <div className="space-y-3" style={{ paddingLeft: '2.125rem' }}>
            {generalComments.map((c) => (
              <div key={c.id} className="print-reply">
                <div className="print-reply-meta">
                  {c.author}{c.organisation ? ` · ${c.organisation}` : ''} &nbsp;·&nbsp; {fmtDateTime(c.created_at)}
                </div>
                <div className="print-reply-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Respond QR — links recipients to the public reply portal */}
      <section className="rd-rule mt-6 border-t border-[var(--line)] pt-5">
        <RespondQr debriefId={d.id} />
      </section>

      <footer className="rd-rule rd-muted mt-6 border-t border-[var(--line)] pt-4 font-mono text-[12px] text-[var(--ink-500)]">
        RAID Incident Debrief · Generated {fmtDateTime(new Date().toISOString())}
      </footer>
    </article>
  );
}

function Block({
  letter,
  title,
  accent = 'var(--nr-orange)',
  children,
}: {
  letter: string;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="rd-accent flex h-6 w-6 items-center justify-center rounded font-mono text-[14px] font-medium"
          style={{ background: 'var(--nr-orange-glow)', color: accent }}
        >
          {letter}
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--ink-100)]">{title}</h2>
      </div>
      <div className="pl-8.5" style={{ paddingLeft: '2.125rem' }}>
        {children}
      </div>
    </section>
  );
}

// ─── ILR review block (rendered inside the printed report) ──────────────────

const ILR_QUESTIONS: Array<{ key: keyof IlrReview; label: string }> = [
  { key: 'q1', label: 'Did you follow Disruption Management principles?' },
  { key: 'q2', label: 'How was the incident classified?' },
  { key: 'q3', label: 'Did you agree initial service status and options with TRC / Sig within 10 min?' },
  { key: 'q4', label: 'Was ITSR implemented — if so, when was the first call / huddle?' },
  { key: 'q5', label: 'Were there any communications concerns during the incident?' },
];

function IlrAnswerPill({ answer }: { answer: IlrAnswer['answer'] }) {
  if (!answer) return <span className="text-[var(--ink-500)] font-mono text-[12px]">—</span>;
  const isYes = answer === 'yes';
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[12px] font-medium uppercase tracking-wide"
      style={{
        background: isYes ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)',
        border: `1px solid ${isYes ? 'rgba(39,174,96,0.4)' : 'rgba(231,76,60,0.4)'}`,
        color: isYes ? '#4ED88B' : '#FF8077',
      }}
    >
      {isYes ? '✓ Yes' : '✗ No'}
    </span>
  );
}

function IlrReviewBlock({ review }: { review: IlrReview }) {
  const hasAnyAnswer = ILR_QUESTIONS.some((q) => review[q.key].answer !== null);
  if (!hasAnyAnswer) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="rd-accent flex h-6 items-center justify-center rounded px-1.5 font-mono text-[11px] font-medium"
          style={{ background: 'var(--nr-orange-glow)', color: 'var(--nr-orange)' }}
        >
          ILR
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--ink-100)]">Stage 1 Review</h2>
      </div>
      <div style={{ paddingLeft: '2.125rem' }}>
        <div className="space-y-3">
          {ILR_QUESTIONS.map(({ key, label }, i) => {
            const a = review[key];
            return (
              <div key={key} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] leading-snug text-[var(--ink-300)]">
                    <span className="mr-2 font-mono text-[12px] text-[var(--nr-orange)]">Q{i + 1}</span>
                    {label}
                  </span>
                  <IlrAnswerPill answer={a.answer} />
                </div>
                {/* Extra detail (Q2) */}
                {key === 'q2' && a.answer === 'yes' && (a.level || a.escalated) && (
                  <div className="mt-1.5 flex flex-wrap gap-4 pl-6 font-mono text-[12px] text-[var(--ink-400)]">
                    {a.level && <span>Level: <span className="text-[var(--ink-200)]">{a.level}</span></span>}
                    {a.escalated && (
                      <span>Escalated: <span className="text-[var(--ink-200)]">{a.escalated === 'yes' ? 'Yes' : 'No'}</span></span>
                    )}
                  </div>
                )}
                {/* Extra detail (Q4) */}
                {key === 'q4' && a.answer === 'yes' && (a.huddleTime || a.furtherHuddles) && (
                  <div className="mt-1.5 flex flex-wrap gap-4 pl-6 font-mono text-[12px] text-[var(--ink-400)]">
                    {a.huddleTime && <span>First call / huddle: <span className="text-[var(--ink-200)]">{a.huddleTime}</span></span>}
                    {a.furtherHuddles && (
                      <span>Further huddles: <span className="text-[var(--ink-200)]">{a.furtherHuddles === 'yes' ? 'Yes' : 'No'}</span></span>
                    )}
                  </div>
                )}
                {/* Comment */}
                {a.comment && (
                  <p className="mt-1.5 pl-6 text-[13px] italic leading-relaxed text-[var(--ink-400)]">
                    {a.comment}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ViewpointPoints({
  label,
  color,
  points,
  debriefId,
  reactions,
  onReactionsChanged,
}: {
  label: string;
  color: string;
  points: Point[];
  debriefId: string;
  reactions: Reaction[];
  onReactionsChanged?: (all: Reaction[]) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color }}>
        {label}
      </div>
      <ul className="space-y-1">
        {points
          .filter((p) => p.text.trim())
          .map((p) => (
            <li key={p.id} className="flex gap-2.5 text-[14px] leading-relaxed text-[var(--ink-300)]">
              <span className="rd-accent mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--nr-orange)]" />
              <span className="flex-1">
                {p.text}
                <ReactionBar
                  debriefId={debriefId}
                  pointId={p.id}
                  reactions={reactions}
                  onChanged={onReactionsChanged}
                />
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function PointList({
  debriefId,
  points,
  reactions,
  onReactionsChanged,
  empty,
}: {
  debriefId: string;
  points: Point[];
  reactions: Reaction[];
  onReactionsChanged?: (all: Reaction[]) => void;
  empty: string;
}) {
  const filtered = points.filter((p) => p.text.trim());
  if (filtered.length === 0)
    return <p className="rd-muted text-[14px] text-[var(--ink-500)]">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {filtered.map((p) => (
        <li key={p.id} className="flex gap-2.5 text-[15px] leading-relaxed text-[var(--ink-300)]">
          <span className="rd-accent mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--nr-orange)]" />
          <span className="flex-1">
            {p.text}
            <ReactionBar
              debriefId={debriefId}
              pointId={p.id}
              reactions={reactions}
              onChanged={onReactionsChanged}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
