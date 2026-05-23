'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';
import { Debrief } from '@/lib/types';
import { listDebriefs, createDebrief } from '@/lib/store';
import { fmtDate, fmtRelative } from '@/lib/format';

export default function DashboardPage() {
  const router = useRouter();
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listDebriefs()
      .then(setDebriefs)
      .finally(() => setLoading(false));
  }, []);

  const handleNew = async () => {
    setCreating(true);
    const d = await createDebrief();
    router.push(`/debrief/${d.id}`);
  };

  const drafts = debriefs.filter((d) => d.status === 'draft');
  const published = debriefs.filter((d) => d.status === 'published');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="label-micro mb-1">Reality · Actions · Inactions · Directives</p>
            <h1 className="serif text-[32px] leading-none text-[var(--ink-100)]">
              Incident Debriefs
            </h1>
          </div>
          <button className="btn btn-primary" onClick={handleNew} disabled={creating}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            New Debrief
          </button>
        </div>

        {loading ? (
          <p className="font-mono text-[12px] text-[var(--ink-500)]">Loading debriefs…</p>
        ) : (
          <div className="space-y-10">
            <Group title="Open" count={drafts.length}>
              {drafts.length === 0 ? (
                <Empty label="No open debriefs. Start a new one to begin." />
              ) : (
                drafts.map((d) => <Row key={d.id} d={d} />)
              )}
            </Group>

            <Group title="Published" count={published.length}>
              {published.length === 0 ? (
                <Empty label="Nothing published yet." />
              ) : (
                published.map((d) => <Row key={d.id} d={d} />)
              )}
            </Group>
          </div>
        )}
      </main>
    </>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="label-micro !text-[var(--ink-300)]">{title}</h2>
        <span className="font-mono text-[11px] text-[var(--ink-500)]">{count}</span>
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--line)] px-5 py-8 text-center font-mono text-[11px] text-[var(--ink-500)]">
      {label}
    </div>
  );
}

function Row({ d }: { d: Debrief }) {
  return (
    <Link href={`/debrief/${d.id}`} className="card tick-corners block px-5 py-4 transition hover:translate-x-0.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileText size={16} className="shrink-0 text-[var(--ink-400)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="truncate text-[14px] font-semibold text-[var(--ink-100)]">
                {d.title || 'Untitled incident'}
              </span>
              {d.ref && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--ink-500)]">{d.ref}</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] text-[var(--ink-500)]">
              {d.incident_type && <span>{d.incident_type}</span>}
              {d.location && <span className="truncate">· {d.location}</span>}
              {d.incident_date && <span>· {fmtDate(d.incident_date)}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden font-mono text-[10px] text-[var(--ink-500)] sm:block">
            {fmtRelative(d.updated_at)}
          </span>
          <StatusPill status={d.status} />
        </div>
      </div>
    </Link>
  );
}
