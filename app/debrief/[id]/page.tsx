'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import ControlGate from '@/components/ControlGate';
import DebriefEditor from '@/components/DebriefEditor';
import DebriefReview from '@/components/DebriefReview';
import { Debrief } from '@/lib/types';
import { getDebrief } from '@/lib/store';

export default function DebriefPage() {
  return (
    <>
      <Header />
      <ControlGate>
        <DebriefLoader />
      </ControlGate>
    </>
  );
}

function DebriefLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!id) return;
    getDebrief(id).then((d) => {
      if (d) {
        setDebrief(d);
        setState('ready');
      } else {
        setState('missing');
      }
    });
  }, [id]);

  return (
    <>
      {state === 'loading' && (
        <div className="flex items-center justify-center py-32 font-mono text-[14px] text-[var(--ink-500)]">
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
        </div>
      )}
      {state === 'missing' && (
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="serif mb-3 text-[28px] text-[var(--ink-100)]">Debrief not found</h1>
          <p className="mb-6 text-[15px] text-[var(--ink-400)]">
            This debrief may have been deleted, or exists only in another browser&apos;s local storage.
          </p>
          <Link href="/" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>
      )}
      {state === 'ready' && debrief && (
        debrief.status === 'published'
          ? <DebriefReview initial={debrief} />
          : <DebriefEditor initial={debrief} />
      )}
    </>
  );
}
