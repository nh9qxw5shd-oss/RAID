'use client';

import SectionCard from '../SectionCard';
import { Directive } from '@/lib/types';
import { uid } from '@/lib/format';
import { Plus, X } from 'lucide-react';

export default function DirectivesSection({
  blocks,
  onChange,
}: {
  blocks: Directive[];
  onChange: (blocks: Directive[]) => void;
}) {
  const addBlock = () =>
    onChange([
      ...blocks,
      { id: uid(), to: '', questions: [{ id: uid(), text: '' }] },
    ]);
  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const patchBlock = (id: string, patch: Partial<Directive>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const addQ = (bid: string) =>
    onChange(
      blocks.map((b) =>
        b.id === bid ? { ...b, questions: [...b.questions, { id: uid(), text: '' }] } : b,
      ),
    );
  const removeQ = (bid: string, qid: string) =>
    onChange(
      blocks.map((b) =>
        b.id === bid ? { ...b, questions: b.questions.filter((q) => q.id !== qid) } : b,
      ),
    );
  const updateQ = (bid: string, qid: string, text: string) =>
    onChange(
      blocks.map((b) =>
        b.id === bid
          ? { ...b, questions: b.questions.map((q) => (q.id === qid ? { ...q, text } : q)) }
          : b,
      ),
    );

  return (
    <SectionCard
      badge="D"
      title="Directives"
      hint="Follow-up actions & questions requiring a response"
    >
      {blocks.map((block) => (
        <div key={block.id} className="mb-3 rounded border border-[var(--line)] bg-[var(--bg-panel)] p-4">
          <div className="mb-3 flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
            <span
              className="pill"
              style={{ background: 'var(--nr-orange-glow)', border: '1px solid rgba(224,82,6,0.3)', color: 'var(--nr-orange)' }}
            >
              To
            </span>
            <input
              className="input flex-1"
              value={block.to}
              onChange={(e) => patchBlock(block.id, { to: e.target.value })}
              placeholder="Recipient party / function / organisation"
            />
            <button
              type="button"
              className="btn btn-ghost btn-danger !px-2.5"
              onClick={() => removeBlock(block.id)}
              aria-label="Remove block"
            >
              <X size={13} />
            </button>
          </div>

          {block.questions.map((q, idx) => (
            <div key={q.id} className="mb-2 flex items-center gap-2">
              <span className="w-7 shrink-0 font-mono text-[13px] text-[var(--ink-400)]">
                Q{idx + 1}
              </span>
              <input
                className="input"
                value={q.text}
                onChange={(e) => updateQ(block.id, q.id, e.target.value)}
                placeholder="Question requiring a response…"
              />
              <button
                type="button"
                className="btn btn-ghost btn-danger !px-2.5"
                onClick={() => removeQ(block.id, q.id)}
                aria-label="Remove question"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-ghost mt-1" onClick={() => addQ(block.id)}>
            <Plus size={13} /> Add question
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost" onClick={addBlock}>
        <Plus size={13} /> Add recipient block
      </button>
    </SectionCard>
  );
}
