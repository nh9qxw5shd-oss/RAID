'use client';

import { LogOut } from 'lucide-react';
import { useSession } from '@/lib/session';

/** Small "signed in as" chip with sign-out, shown in both headers. */
export default function SessionBadge() {
  const { session, logout } = useSession();
  if (!session) return null;

  return (
    <span className="flex items-center gap-2">
      <span
        className="rounded border px-2 py-0.5 font-mono text-[12px]"
        style={{
          borderColor: 'var(--nr-orange)',
          background: 'var(--nr-orange-glow)',
          color: 'var(--ink-200)',
        }}
        title={session.isControl ? 'Signed in as Control' : `Signed in as ${session.name}`}
      >
        {session.name}
      </span>
      <button
        onClick={() => logout()}
        title="Sign out"
        aria-label="Sign out"
        className="flex items-center justify-center rounded p-1 text-[var(--ink-400)] transition-colors hover:text-[var(--ink-200)]"
      >
        <LogOut size={14} />
      </button>
    </span>
  );
}
