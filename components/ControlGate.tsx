'use client';

import { Loader2 } from 'lucide-react';
import { useSession } from '@/lib/session';
import EntityGate from './EntityGate';

/**
 * Wraps control-side pages (dashboard, editor, settings). In server mode
 * the content renders only for a signed-in Control session; anyone else
 * sees the sign-in gate. In local mode there is no server to enforce
 * anything, so the gate is skipped and behaviour is unchanged.
 */
export default function ControlGate({ children }: { children: React.ReactNode }) {
  const { session, loading, serverMode } = useSession();

  if (!serverMode) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 font-mono text-[14px] text-[var(--ink-500)]">
        <Loader2 size={16} className="mr-2 animate-spin" /> Checking session…
      </div>
    );
  }

  if (!session?.isControl) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <EntityGate
          controlOnly
          subtitle="This area is restricted to Control. Enter the Control passcode to continue."
        />
      </div>
    );
  }

  return <>{children}</>;
}
