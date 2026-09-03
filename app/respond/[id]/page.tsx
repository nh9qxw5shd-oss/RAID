'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp, Download, Loader2, ShieldCheck } from 'lucide-react';
import { Comment, Debrief } from '@/lib/types';
import { getDebrief, listAllComments } from '@/lib/store';
import { useSession } from '@/lib/session';
import CommentThread from '@/components/CommentThread';
import EntityGate from '@/components/EntityGate';
import ReportDocument from '@/components/ReportDocument';

export default function RespondDebriefPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { session, loading: sessionLoading } = useSession();
  const [gateOpen, setGateOpen] = useState(false);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  // Comments back the print-only blocks; responses posted here are appended so
  // a freshly generated PDF always includes the latest commentary.
  const [allComments, setAllComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!id) return;
    getDebrief(id).then((d) => {
      // Only published debriefs are open to stakeholder commentary.
      if (d && d.status === 'published') {
        setDebrief(d);
        setState('ready');
        listAllComments(d.id).then(setAllComments).catch(() => {/* best-effort */});
      } else {
        setState('missing');
      }
    });
  }, [id]);

  const handleCommentAdded = (c: Comment) => setAllComments((prev) => [...prev, c]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-32 font-mono text-[14px] text-[var(--ink-500)]">
        <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
      </div>
    );
  }

  if (state === 'missing' || !debrief) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="serif mb-3 text-[28px] text-[var(--ink-100)]">
          Incident not available
        </h1>
        <p className="mb-6 text-[15px] text-[var(--ink-400)]">
          This incident isn&apos;t published for commentary, or the link is no
          longer valid.
        </p>
        <Link href="/respond" className="btn btn-ghost">
          View open incidents
        </Link>
      </div>
    );
  }

  const d = debrief;

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      {/* Controls (hidden in print) */}
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href="/respond" className="btn btn-ghost">
          <ArrowLeft size={14} /> All incidents
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Download size={14} /> Download PDF
        </button>
      </div>

      <p className="no-print mb-4 text-[13px] leading-relaxed text-[var(--ink-400)]">
        Read the report below, add your organisation&apos;s viewpoint, answer a
        directive, or add commentary. Use{' '}
        <span className="text-[var(--ink-200)]">Download PDF</span> at any time to
        generate an up-to-date copy including the latest responses.
      </p>

      {/* Contributor sign-in — reading stays open, contributing needs an entity session */}
      {!sessionLoading && !session && (
        <div className="no-print mb-5">
          <button
            className="flex w-full items-center gap-2.5 rounded border border-[var(--line-hi)] bg-[var(--bg-panel)] px-4 py-3 text-left transition hover:border-[var(--nr-orange)]"
            onClick={() => setGateOpen((v) => !v)}
          >
            <ShieldCheck size={15} className="shrink-0 text-[var(--nr-orange)]" />
            <span className="flex-1 text-[14px] text-[var(--ink-200)]">
              Sign in as your organisation to add your viewpoint, support or
              contest points, and comment.
            </span>
            {gateOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {gateOpen && (
            <div className="mt-3">
              <EntityGate onSignedIn={() => setGateOpen(false)} />
            </div>
          )}
        </div>
      )}

      {/* Report document — also the print surface, identical to control's PDF */}
      <ReportDocument debrief={d} comments={allComments} onCommentAdded={handleCommentAdded} />

      {/* General commentary (screen only) */}
      <div className="no-print">
        <CommentThread debriefId={d.id} debriefTitle={d.title} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  );
}
