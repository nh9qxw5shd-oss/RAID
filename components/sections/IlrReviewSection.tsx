'use client';

import { Check, X } from 'lucide-react';
import SectionCard from '../SectionCard';
import TimePicker from '../TimePicker';
import { IlrAnswer, IlrReview, emptyIlrReview } from '@/lib/types';

// ─── yes/no toggle ──────────────────────────────────────────────────────────

function YesNoToggle({
  value,
  onChange,
}: {
  value: 'yes' | 'no' | null;
  onChange: (v: 'yes' | 'no') => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      {/* Yes — tick */}
      <button
        type="button"
        aria-label="Yes"
        aria-pressed={value === 'yes'}
        onClick={() => onChange('yes')}
        className="ilr-toggle ilr-toggle-yes"
        data-active={value === 'yes'}
      >
        <Check size={22} strokeWidth={2.5} />
      </button>
      {/* No — cross */}
      <button
        type="button"
        aria-label="No"
        aria-pressed={value === 'no'}
        onClick={() => onChange('no')}
        className="ilr-toggle ilr-toggle-no"
        data-active={value === 'no'}
      >
        <X size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── inline yes/no sub-question (smaller) ───────────────────────────────────

function SubToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 'yes' | 'no' | null;
  onChange: (v: 'yes' | 'no') => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[12px] text-[var(--ink-400)]">{label}</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          aria-label={`${label} yes`}
          onClick={() => onChange('yes')}
          className="ilr-sub-toggle ilr-sub-toggle-yes"
          data-active={value === 'yes'}
        >
          <Check size={13} strokeWidth={2.5} />
          <span>Yes</span>
        </button>
        <button
          type="button"
          aria-label={`${label} no`}
          onClick={() => onChange('no')}
          className="ilr-sub-toggle ilr-sub-toggle-no"
          data-active={value === 'no'}
        >
          <X size={13} strokeWidth={2.5} />
          <span>No</span>
        </button>
      </div>
    </div>
  );
}

// ─── single question row ─────────────────────────────────────────────────────

interface QuestionRowProps {
  number: number;
  question: string;
  answer: IlrAnswer;
  onChange: (patch: Partial<IlrAnswer>) => void;
  commentLabel?: string;
  /** Show comment only when a specific answer is selected (undefined = always) */
  showCommentOn?: 'yes' | 'no';
  children?: React.ReactNode; // additional follow-up controls
}

function QuestionRow({
  number,
  question,
  answer,
  onChange,
  commentLabel = 'Comments',
  showCommentOn,
  children,
}: QuestionRowProps) {
  const showComment =
    showCommentOn === undefined
      ? answer.answer !== null
      : answer.answer === showCommentOn;

  return (
    <div className="ilr-row">
      {/* Question */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 font-mono text-[12px] font-medium text-[var(--nr-orange)]">
          Q{number}
        </span>
        <p className="flex-1 text-[14px] leading-snug text-[var(--ink-200)]">{question}</p>
        <YesNoToggle value={answer.answer} onChange={(v) => onChange({ answer: v })} />
      </div>

      {/* Conditional follow-up */}
      {answer.answer !== null && (
        <div className="ilr-followup">
          {/* Extra controls passed in (Q2, Q4 extras) */}
          {children}

          {/* Comment textarea */}
          {showComment && (
            <div>
              <label className="label-micro mb-1.5 block">{commentLabel}</label>
              <textarea
                className="textarea"
                rows={3}
                value={answer.comment}
                onChange={(e) => onChange({ comment: e.target.value })}
                placeholder="Add any relevant notes…"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main section component ──────────────────────────────────────────────────

export default function IlrReviewSection({
  value,
  onChange,
}: {
  value: IlrReview | undefined;
  onChange: (updated: IlrReview) => void;
}) {
  const review = value ?? emptyIlrReview();

  const patch = <K extends keyof IlrReview>(key: K, p: Partial<IlrAnswer>) =>
    onChange({ ...review, [key]: { ...review[key], ...p } });

  return (
    <>
      <style>{`
        .ilr-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 4px;
          border: 2px solid var(--line);
          background: var(--bg-card);
          color: var(--ink-500);
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .ilr-toggle:hover { border-color: var(--line-hi); color: var(--ink-300); }

        .ilr-toggle-yes[data-active="true"] {
          background: rgba(39,174,96,0.15);
          border-color: var(--nr-green);
          color: var(--nr-green);
          box-shadow: 0 0 12px rgba(39,174,96,0.2);
        }
        .ilr-toggle-yes:hover { border-color: rgba(39,174,96,0.5); color: rgba(39,174,96,0.7); }

        .ilr-toggle-no[data-active="true"] {
          background: rgba(231,76,60,0.15);
          border-color: var(--nr-red);
          color: var(--nr-red);
          box-shadow: 0 0 12px rgba(231,76,60,0.2);
        }
        .ilr-toggle-no:hover { border-color: rgba(231,76,60,0.5); color: rgba(231,76,60,0.7); }

        .ilr-sub-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 3px;
          border: 1px solid var(--line);
          background: var(--bg-card);
          color: var(--ink-500);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ilr-sub-toggle-yes[data-active="true"] {
          background: rgba(39,174,96,0.12);
          border-color: rgba(39,174,96,0.5);
          color: var(--nr-green);
        }
        .ilr-sub-toggle-no[data-active="true"] {
          background: rgba(231,76,60,0.12);
          border-color: rgba(231,76,60,0.5);
          color: var(--nr-red);
        }

        .ilr-row {
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
        }
        .ilr-row:last-child { border-bottom: none; padding-bottom: 0; }

        .ilr-followup {
          margin-top: 12px;
          padding: 12px;
          background: var(--bg-panel);
          border-radius: 4px;
          border: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>

      <SectionCard badge="ILR" title="Stage 1 Review" hint="Post-incident learning review">
        {/* Q1 — Disruption Management */}
        <QuestionRow
          number={1}
          question="Did you follow Disruption Management principles?"
          answer={review.q1}
          onChange={(p) => patch('q1', p)}
          commentLabel="If no, please add comments"
          showCommentOn="no"
        />

        {/* Q2 — Level of Disruption */}
        <QuestionRow
          number={2}
          question="How was the incident classified?"
          answer={review.q2}
          onChange={(p) => patch('q2', p)}
          showCommentOn={undefined}
        >
          {review.q2.answer === 'yes' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="label-micro">Level</span>
                <input
                  className="input w-36"
                  value={review.q2.level ?? ''}
                  onChange={(e) => patch('q2', { level: e.target.value })}
                  placeholder="e.g. Red"
                />
              </div>
              <SubToggle
                label="Escalated?"
                value={review.q2.escalated ?? null}
                onChange={(v) => patch('q2', { escalated: v })}
              />
            </div>
          )}
        </QuestionRow>

        {/* Q3 — Service Containment / TRC */}
        <QuestionRow
          number={3}
          question="Did you agree initial service status and options with TRC / Sig within 10 min?"
          answer={review.q3}
          onChange={(p) => patch('q3', p)}
          commentLabel="Comments"
          showCommentOn="no"
        />

        {/* Q4 — Huddle */}
        <QuestionRow
          number={4}
          question="Was ITSR implemented — if so, when was the first call / huddle?"
          answer={review.q4}
          onChange={(p) => patch('q4', p)}
          commentLabel="Comments"
          showCommentOn={undefined}
        >
          {review.q4.answer === 'yes' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="label-micro">First call / huddle</span>
                <TimePicker
                  value={review.q4.huddleTime ?? ''}
                  onChange={(v) => patch('q4', { huddleTime: v })}
                />
              </div>
              <SubToggle
                label="Further Huddles?"
                value={review.q4.furtherHuddles ?? null}
                onChange={(v) => patch('q4', { furtherHuddles: v })}
              />
            </div>
          )}
        </QuestionRow>

        {/* Q5 — Communications */}
        <QuestionRow
          number={5}
          question="Were there any communications concerns during the incident?"
          answer={review.q5}
          onChange={(p) => patch('q5', p)}
          commentLabel="If yes, please add comments"
          showCommentOn="yes"
        />
      </SectionCard>
    </>
  );
}
