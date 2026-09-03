import type { Metadata } from 'next';
import Link from 'next/link';
import SessionBadge from '@/components/SessionBadge';

export const metadata: Metadata = {
  title: 'Respond — RAID Incident Debrief',
  description:
    'Add commentary or answer a directive on a published incident debrief.',
};

/**
 * Layout for the public stakeholder "Respond" portal. Deliberately minimal:
 * its own header links only back to the respond index — it never surfaces the
 * dashboard, editor, drafts, or any control-side functionality.
 */
export default function RespondLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="no-print sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/respond" className="flex items-center gap-3">
            <span
              className="font-mono text-[17px] font-medium uppercase tracking-[0.14em] text-[var(--nr-orange)]"
              style={{ textShadow: '0 0 18px rgba(224,82,6,0.4)' }}
            >
              RAID
            </span>
            <span className="h-4 w-px bg-[var(--line-hi)]" />
            <span className="label-micro !text-[var(--ink-300)]">Respond</span>
          </Link>
          <span className="flex items-center gap-3">
            <SessionBadge />
            <span className="label-micro">Stakeholder portal</span>
          </span>
        </div>
      </header>
      <main className="relative z-[1]">{children}</main>
    </>
  );
}
