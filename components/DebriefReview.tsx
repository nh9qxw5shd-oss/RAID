'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Mail, Undo2 } from 'lucide-react';
import { Comment, Debrief, EntityResponse, PublishEmailResult, PublishNotice, Reaction } from '@/lib/types';
import {
  revertToDraft,
  listAllComments,
  listReactions,
  listResponses,
  listPublishNotices,
  resendPublishNotice,
} from '@/lib/store';
import { fmtRelative } from '@/lib/format';
import { useSession } from '@/lib/session';
import CommentThread from './CommentThread';
import ConfirmModal from './ConfirmModal';
import EmailOutcome from './EmailOutcome';
import PublishModal from './PublishModal';
import ReportDocument from './ReportDocument';

export default function DebriefReview({ initial }: { initial: Debrief }) {
  const router = useRouter();
  const d = initial;
  const [revertOpen, setRevertOpen] = useState(false);

  // Fetch all comments once on mount — used to render them in the PDF.
  // New responses posted on screen are appended so the printed copy stays
  // current without a reload.
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [responses, setResponses] = useState<EntityResponse[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  useEffect(() => {
    listAllComments(d.id).then(setAllComments).catch(() => {/* best-effort */});
    listResponses(d.id).then(setResponses).catch(() => {/* best-effort */});
    listReactions(d.id).then(setReactions).catch(() => {/* best-effort */});
  }, [d.id]);

  // Publish-notice history — the latest attempt is surfaced so a failed
  // email is visible to Control, with a resend.
  const { serverMode } = useSession();
  const [notices, setNotices] = useState<PublishNotice[] | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<PublishEmailResult | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  useEffect(() => {
    if (!serverMode) return;
    listPublishNotices(d.id).then(setNotices).catch(() => setNotices([]));
  }, [d.id, serverMode]);

  const doResend = async (recipientIds: string[]) => {
    setResendOpen(false);
    setResending(true);
    setResendError(null);
    try {
      setResendResult(await resendPublishNotice(d.id, recipientIds));
    } catch (err) {
      setResendError((err as Error).message);
    }
    setResending(false);
    listPublishNotices(d.id).then(setNotices).catch(() => {/* keep last */});
  };

  const latest = notices?.[0];
  const latestOutcome: PublishEmailResult | null = resendResult
    ?? (latest
      ? { attempted: latest.attempted, sent: latest.sent, pdfAttached: latest.pdf_attached, error: latest.error ?? undefined }
      : null);

  const handleCommentAdded = (c: Comment) => setAllComments((prev) => [...prev, c]);

  const doRevert = async () => {
    setRevertOpen(false);
    await revertToDraft(d.id);
    // Return to dashboard so user sees the debrief now listed as draft
    router.push('/');
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <ConfirmModal
        open={revertOpen}
        title="Reopen as draft?"
        message="This will move the debrief back to draft status. Recipients will no longer be able to post responses until it is published again."
        confirmLabel="Reopen"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={doRevert}
        onCancel={() => setRevertOpen(false)}
      />

      <PublishModal
        open={resendOpen}
        mode="resend"
        onConfirm={doResend}
        onCancel={() => setResendOpen(false)}
      />

      {/* Controls (hidden in print) */}
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href="/" className="btn btn-ghost">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {serverMode && (
            <button className="btn btn-ghost" onClick={() => setResendOpen(true)} disabled={resending}>
              {resending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Resend notice
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setRevertOpen(true)}>
            <Undo2 size={13} /> Reopen as draft
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Email notice status (screen only) */}
      {serverMode && notices && (
        <div className="no-print mb-5">
          {resendError ? (
            <EmailOutcome result={{ attempted: 0, sent: 0, pdfAttached: false, error: `Resend request failed: ${resendError}` }} />
          ) : latestOutcome ? (
            <EmailOutcome
              result={latestOutcome}
              when={resendResult ? 'resent just now' : `${latest!.kind === 'resend' ? 'resent' : 'sent'} ${fmtRelative(latest!.created_at)}`}
            />
          ) : (
            <p className="font-mono text-[13px] text-[var(--ink-500)]">
              No email notice on record for this debrief. Use &ldquo;Resend notice&rdquo; to email the distribution list.
            </p>
          )}
        </div>
      )}

      {/* Report document — also the print surface */}
      <ReportDocument
        debrief={d}
        comments={allComments}
        responses={responses}
        reactions={reactions}
        onCommentAdded={handleCommentAdded}
        onReactionsChanged={setReactions}
      />

      {/* Commentary (screen only) */}
      <div className="no-print">
        <CommentThread debriefId={d.id} debriefTitle={d.title} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  );
}
