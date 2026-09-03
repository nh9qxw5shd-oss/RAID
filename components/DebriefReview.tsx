'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Undo2 } from 'lucide-react';
import { Comment, Debrief, EntityResponse, Reaction } from '@/lib/types';
import { revertToDraft, listAllComments, listReactions, listResponses } from '@/lib/store';
import CommentThread from './CommentThread';
import ConfirmModal from './ConfirmModal';
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

      {/* Controls (hidden in print) */}
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href="/" className="btn btn-ghost">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" onClick={() => setRevertOpen(true)}>
            <Undo2 size={13} /> Reopen as draft
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

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
