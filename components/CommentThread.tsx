'use client';

import { useEffect, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Comment } from '@/lib/types';
import { listComments, addComment } from '@/lib/store';
import { fmtDateTime } from '@/lib/format';

export default function CommentThread({ debriefId }: { debriefId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [org, setOrg] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    listComments(debriefId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [debriefId]);

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    const c = await addComment(debriefId, author.trim(), org.trim(), body.trim());
    setComments((prev) => [...prev, c]);
    setBody('');
    setPosting(false);
  };

  return (
    <section className="card tick-corners mt-3">
      <div
        className="flex items-center gap-2.5 border-b border-[var(--line)] px-5 py-3"
        style={{ background: 'linear-gradient(180deg, var(--bg-card-hi), var(--bg-card))' }}
      >
        <MessageSquare size={14} className="text-[var(--nr-orange)]" />
        <h2 className="flex-1 text-[13px] font-semibold">Commentary</h2>
        <span className="font-mono text-[11px] text-[var(--ink-500)]">{comments.length}</span>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="font-mono text-[11px] text-[var(--ink-500)]">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="mb-4 font-mono text-[11px] text-[var(--ink-500)]">
            No commentary yet. Be the first to respond.
          </p>
        ) : (
          <ul className="mb-5 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded border border-[var(--line)] bg-[var(--bg-panel)] p-3.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[var(--ink-100)]">
                    {c.author}
                    {c.organisation && (
                      <span className="ml-2 font-normal text-[var(--ink-400)]">· {c.organisation}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--ink-500)]">
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

        <div className="rounded border border-[var(--line)] bg-[var(--bg-panel)] p-4">
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <input
              className="input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
            />
            <input
              className="input"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Organisation (optional)"
            />
          </div>
          <textarea
            className="textarea mb-2.5"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add commentary, a response to a directive, or a follow-up action…"
          />
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={submit} disabled={posting || !body.trim()}>
              <Send size={13} /> Post comment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
