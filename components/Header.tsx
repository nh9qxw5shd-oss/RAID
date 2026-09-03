'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, X, CheckCircle2, AlertTriangle, Smartphone, Settings } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getPermission, requestPermission, registerServiceWorker } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import SessionBadge from './SessionBadge';

type NotifState = 'unsupported' | 'default' | 'granted' | 'denied';

export default function Header() {
  const { session } = useSession();
  const [now, setNow] = useState('');
  const [configured, setConfigured] = useState(true);
  const [notifPerm, setNotifPerm] = useState<NotifState>('default');
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
    setNotifPerm(getPermission() as NotifState);

    const tick = () =>
      setNow(
        new Date().toLocaleString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !bellRef.current?.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [panelOpen]);

  const handleEnable = async () => {
    const perm = await requestPermission();
    setNotifPerm(perm as NotifState);
    if (perm === 'granted') await registerServiceWorker();
  };

  const bellActive = notifPerm === 'granted';

  return (
    <header className="no-print sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="font-mono text-[17px] font-medium uppercase tracking-[0.14em] text-[var(--nr-orange)]"
            style={{ textShadow: '0 0 18px rgba(224,82,6,0.4)' }}
          >
            RAID
          </span>
          <span className="h-4 w-px bg-[var(--line-hi)]" />
          <span className="label-micro !text-[var(--ink-300)]">Incident Debrief</span>
        </Link>

        <div className="flex items-center gap-4">
          {!configured && (
            <span
              className="pill pill-draft"
              title="No Supabase backend detected — running on local browser storage"
            >
              Local mode
            </span>
          )}
          <span className="font-mono text-[13px] text-[var(--ink-500)]">{now}</span>
          <SessionBadge />

          {session?.isControl && (
            <Link
              href="/settings"
              title="Settings — entities & distribution list"
              aria-label="Settings"
              className="flex items-center justify-center rounded p-1 text-[var(--ink-400)] transition-colors hover:text-[var(--ink-200)]"
            >
              <Settings size={15} />
            </Link>
          )}

          {/* Bell — always visible */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setPanelOpen((v) => !v)}
              title={bellActive ? 'Notifications on' : 'Notification settings'}
              className="flex items-center justify-center rounded p-1 text-[var(--ink-400)] transition-colors hover:text-[var(--ink-200)]"
              aria-label="Notification settings"
              aria-expanded={panelOpen}
            >
              {bellActive ? (
                <Bell size={15} className="text-[var(--nr-orange)]" />
              ) : (
                <BellOff size={15} />
              )}
            </button>

            {/* Notification panel */}
            {panelOpen && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full z-50 mt-2 w-72 rounded border border-[var(--line-hi)] shadow-2xl"
                style={{ background: 'var(--bg-card-hi)' }}
                role="dialog"
                aria-label="Notification settings"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                  <span className="label-micro">Notifications</span>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="text-[var(--ink-500)] hover:text-[var(--ink-200)]"
                    aria-label="Close"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="p-4">
                  {notifPerm === 'granted' && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--nr-green)]" />
                      <div>
                        <p className="mb-1 text-[13px] font-medium text-[var(--ink-100)]">
                          Notifications enabled
                        </p>
                        <p className="text-[12px] leading-relaxed text-[var(--ink-400)]">
                          You'll receive alerts when debriefs are published and responses are posted.
                          To turn off, use your browser or device notification settings.
                        </p>
                      </div>
                    </div>
                  )}

                  {notifPerm === 'default' && (
                    <div>
                      <p className="mb-2 text-[13px] text-[var(--ink-200)]">
                        Get notified when debriefs are published and responses arrive.
                      </p>
                      <button
                        className="btn btn-primary w-full justify-center"
                        onClick={handleEnable}
                      >
                        <Bell size={13} /> Enable notifications
                      </button>
                    </div>
                  )}

                  {notifPerm === 'denied' && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--nr-red)]" />
                      <div>
                        <p className="mb-1 text-[13px] font-medium text-[var(--ink-100)]">
                          Notifications blocked
                        </p>
                        <p className="text-[12px] leading-relaxed text-[var(--ink-400)]">
                          Your browser is blocking notifications for this site. To enable them,
                          open your browser or device settings, find this site, and allow
                          notifications.
                        </p>
                      </div>
                    </div>
                  )}

                  {notifPerm === 'unsupported' && (
                    <div className="flex items-start gap-3">
                      <Smartphone size={16} className="mt-0.5 shrink-0 text-[var(--nr-orange)]" />
                      <div>
                        <p className="mb-1 text-[13px] font-medium text-[var(--ink-100)]">
                          Install app for notifications
                        </p>
                        <p className="mb-2 text-[12px] leading-relaxed text-[var(--ink-400)]">
                          Your browser doesn't support web notifications directly. Add RAID to
                          your home screen to enable push notifications.
                        </p>
                        <p className="text-[12px] leading-relaxed text-[var(--ink-500)]">
                          <strong className="text-[var(--ink-300)]">iOS Safari:</strong> tap the
                          Share button <span className="font-mono">⎙</span> then{' '}
                          <em>Add to Home Screen</em>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
