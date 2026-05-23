'use client';

import SectionCard from '../SectionCard';
import { Point } from '@/lib/types';
import { uid } from '@/lib/format';
import { Plus, X } from 'lucide-react';

function Column({
  kind,
  rows,
  onChange,
}: {
  kind: 'action' | 'inaction';
  rows: Point[];
  onChange: (rows: Point[]) => void;
}) {
  const isAction = kind === 'action';
  const add = () => onChange([...rows, { id: uid(), text: '' }]);
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const update = (id: string, text: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, text } : r)));

  return (
    <div className="rounded border border-[var(--line)] bg-[var(--bg-panel)] p-4">
      <div
        className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
        style={{ color: isAction ? 'var(--nr-green)' : 'var(--nr-red)' }}
      >
        {isAction ? 'A — Actions' : 'I — Inactions'}
        <span className="font-sans text-[10px] normal-case tracking-normal text-[var(--ink-500)]">
          {isAction ? 'effective actions & good practice' : 'gaps, omissions & improvement areas'}
        </span>
      </div>

      {rows.map((row) => (
        <div key={row.id} className="mb-2 flex items-center gap-2">
          <input
            className="input"
            value={row.text}
            onChange={(e) => update(row.id, e.target.value)}
            placeholder={isAction ? 'What was done well…' : 'What was missed or could improve…'}
          />
          <button
            type="button"
            className="btn btn-ghost btn-danger !px-2.5"
            onClick={() => remove(row.id)}
            aria-label="Remove"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost mt-1" onClick={add}>
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

export default function ActionsInactionsSection({
  actions,
  inactions,
  onActionsChange,
  onInactionsChange,
}: {
  actions: Point[];
  inactions: Point[];
  onActionsChange: (rows: Point[]) => void;
  onInactionsChange: (rows: Point[]) => void;
}) {
  return (
    <SectionCard
      badge="A / I"
      title="Actions & Inactions"
      hint="Balanced assessment — credibility comes from fairness"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column kind="action" rows={actions} onChange={onActionsChange} />
        <Column kind="inaction" rows={inactions} onChange={onInactionsChange} />
      </div>
    </SectionCard>
  );
}
