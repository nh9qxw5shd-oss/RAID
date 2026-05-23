import { DebriefStatus } from '@/lib/types';

export default function StatusPill({ status }: { status: DebriefStatus }) {
  if (status === 'published') {
    return (
      <span className="pill pill-published">
        <span className="live-dot" /> Published
      </span>
    );
  }
  return <span className="pill pill-draft">Draft</span>;
}
