'use client';

import { useEffect, useState } from 'react';
import { Send, MessageCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Comment } from '@/lib/types';
import { listComments, addComment } from '@/lib/store';
import { fmtDateTime } from '@/lib/format';
import { notifyCommentAdded } from '@/lib/notifications';
import { useSession } from '@/lib/session';

export default function DirectiveThread({
  debriefId,
  directiveId,
  debriefTitle,
  onCommentAdded,
}: {
  debriefId: string;
  directiveId: string;
  debriefTitle: string;
  onCommentAdded?: (c: Comment) => void;
}) {
  const { session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    listComments(debriefId, directiveId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [debriefId, directiveId]);

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const c = await addComment(debriefId, author.trim(), body.trim(), directiveId);
      setComments((prev) => [...prev, c]);
      onCommentAdded?.(c);
      setBody('');
      notifyCommentAdded(debriefTitle, true);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to post — please try again.');
    } finally {
      setPosting(false);
    }
  };

  const count = loading ? null : comments.length;

  return (
    <div className="no-print mt-3 border-t border-[var(--line)] pt-2.5">
      <button
        className="flex items-center gap-1.5 font-mono text-[12px] text-[var(--ink-400)] transition-colors hover:text-[var(--ink-200)]"
        onClick={() => setExpanded((v) => !v)}
      >
        <MessageCircle size={12} />
        {count !== null && count > 0
          ? `${count} response${count !== 1 ? 's' : ''}`
          : 'Reply to this directive'}
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2.5">
          {!loading && comments.length > 0 && (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded border border-[var(--line)] bg-[var(--bg-base)] p-3"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[var(--ink-100)]">
                      {c.author}
                      {(c.entity_name || c.organisation) && (
                        <span className="ml-2 font-normal text-[var(--ink-400)]">
                          · {c.entity_name || c.organisation}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--ink-500)]">
                      {fmtDateTime(c.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink-300)]">
                    {c.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {session ? (
          <div className="rounded border border-[var(--line)] bg-[var(--bg-panel)] p-3">
            <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className="input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
              />
              <div className="flex items-center font-mono text-[11px] text-[var(--ink-500)]">
                Posting as <span className="ml-1.5 text-[var(--nr-orange)]">{session.name}</span>
              </div>
            </div>
            <textarea
              className="textarea mb-2"
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Response to this directive…"
            />
            {postError && (
              <p className="mb-1 font-mono text-[12px] text-[var(--nr-red)]">{postError}</p>
            )}
            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={posting || !body.trim()}
              >
                {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Post response
              </button>
            </div>
          </div>
          ) : (
            <p className="rounded border border-dashed border-[var(--line)] px-3 py-2.5 font-mono text-[12px] text-[var(--ink-500)]">
              Sign in as your organisation (top of the page) to respond.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
