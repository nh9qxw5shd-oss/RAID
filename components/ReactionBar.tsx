'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Reaction } from '@/lib/types';
import { setReaction } from '@/lib/store';
import { useSession } from '@/lib/session';

/**
 * Thumb up/down chips under a point. One vote per entity per point,
 * toggleable; votes show entity names rather than anonymous counts so
 * support and contest are attributable ("supported by GTR, LNER"). Static
 * when signed out; entities always see and can change their own vote.
 */
export default function ReactionBar({
  debriefId,
  pointId,
  reactions,
  onChanged,
}: {
  debriefId: string;
  pointId: string;
  /** All reactions for the debrief — filtered here by pointId. */
  reactions: Reaction[];
  onChanged?: (all: Reaction[]) => void;
}) {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  const mine = session
    ? reactions.find((r) => r.point_id === pointId && r.entity_id === session.entityId)
    : undefined;
  const ups = reactions.filter((r) => r.point_id === pointId && r.reaction === 'up');
  const downs = reactions.filter((r) => r.point_id === pointId && r.reaction === 'down');

  if (!session && ups.length === 0 && downs.length === 0) return null;

  const vote = async (kind: 'up' | 'down') => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const next = mine?.reaction === kind ? null : kind;
      onChanged?.(await setReaction(debriefId, pointId, next));
    } catch {
      /* leave state as-is on failure */
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="reaction-bar mt-0.5 flex flex-wrap items-center gap-1.5">
      <Chip
        icon={<ThumbsUp size={11} />}
        entities={ups.map((r) => r.entity_name)}
        active={mine?.reaction === 'up'}
        colour="var(--nr-green)"
        interactive={!!session}
        disabled={busy}
        onClick={() => vote('up')}
        label="Support"
      />
      <Chip
        icon={<ThumbsDown size={11} />}
        entities={downs.map((r) => r.entity_name)}
        active={mine?.reaction === 'down'}
        colour="var(--nr-red)"
        interactive={!!session}
        disabled={busy}
        onClick={() => vote('down')}
        label="Contest"
      />
    </span>
  );
}

function Chip({
  icon,
  entities,
  active,
  colour,
  interactive,
  disabled,
  onClick,
  label,
}: {
  icon: React.ReactNode;
  entities: string[];
  active: boolean;
  colour: string;
  interactive: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  if (!interactive && entities.length === 0) return null;
  const empty = entities.length === 0;
  return (
    <button
      type="button"
      className={`rx-chip inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[11px] leading-none transition ${empty ? 'rx-empty' : ''}`}
      style={{
        borderColor: active ? colour : 'var(--line)',
        color: empty ? 'var(--ink-500)' : colour,
        background: active ? 'color-mix(in srgb, ' + colour + ' 12%, transparent)' : 'transparent',
        cursor: interactive ? 'pointer' : 'default',
      }}
      disabled={disabled || !interactive}
      onClick={onClick}
      title={
        entities.length > 0 ? `${label}: ${entities.join(', ')}` : `${label} this point as your organisation`
      }
      aria-label={label}
    >
      {icon}
      {entities.length > 0 ? <span>{entities.join(' · ')}</span> : <span>{label}</span>}
    </button>
  );
}
