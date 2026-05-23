'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getPermission, requestPermission } from '@/lib/notifications';

export default function Header() {
  const [now, setNow] = useState('');
  const [configured, setConfigured] = useState(true);
  const [notifPerm, setNotifPerm] = useState<string>('unsupported');

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
    setNotifPerm(getPermission());
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

  const handleNotif = async () => {
    if (notifPerm === 'unsupported') return;
    if (notifPerm === 'denied') {
      alert('Notifications are blocked by your browser. Enable them in your browser settings to receive alerts.');
      return;
    }
    const perm = await requestPermission();
    setNotifPerm(perm);
  };

  const notifTitle =
    notifPerm === 'granted'
      ? 'Notifications on — click to review'
      : notifPerm === 'denied'
      ? 'Notifications blocked in browser settings'
      : 'Enable notifications';

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
            <span className="pill pill-draft" title="No Supabase backend detected — running on local browser storage">
              Local mode
            </span>
          )}
          <span className="font-mono text-[13px] text-[var(--ink-500)]">{now}</span>
          {notifPerm !== 'unsupported' && (
            <button
              onClick={handleNotif}
              title={notifTitle}
              className="flex items-center justify-center text-[var(--ink-400)] transition-colors hover:text-[var(--ink-200)]"
              style={{ lineHeight: 0 }}
            >
              {notifPerm === 'granted' ? (
                <Bell size={15} className="text-[var(--nr-orange)]" />
              ) : (
                <BellOff size={15} />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
