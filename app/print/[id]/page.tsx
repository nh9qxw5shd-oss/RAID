import { notFound } from 'next/navigation';
import { verifyPrintToken } from '@/lib/server/auth';
import { serviceClient } from '@/lib/server/db';
import { hydrateDebrief, hydrateResponse } from '@/lib/hydrate';
import { Comment, Reaction } from '@/lib/types';
import ReportDocument from '@/components/ReportDocument';

export const dynamic = 'force-dynamic';

/**
 * Server-rendered print surface for the headless PDF renderer (see
 * lib/server/pdf.ts). Gated by a short-lived signed token rather than a
 * session cookie, so it exposes nothing without one — the publish route
 * mints the token itself. Renders the same ReportDocument as the review
 * page and respond portal, so the emailed PDF is identical to the
 * in-browser export.
 */
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  if (!verifyPrintToken(params.id, searchParams.token)) notFound();

  const sb = serviceClient();
  const { data: debriefRow, error } = await sb
    .from('debriefs')
    .select('*')
    .eq('id', params.id)
    .single();
  if (error || !debriefRow) notFound();

  const [commentsRes, responsesRes, reactionsRes] = await Promise.all([
    sb
      .from('debrief_comments')
      .select('*')
      .eq('debrief_id', params.id)
      .order('created_at', { ascending: true }),
    sb
      .from('entity_responses')
      .select('*, entities(name, slug)')
      .eq('debrief_id', params.id)
      .eq('status', 'submitted'),
    sb
      .from('point_reactions')
      .select('*, entities(name)')
      .eq('debrief_id', params.id),
  ]);

  const debrief = hydrateDebrief(debriefRow);
  const comments = (commentsRes.data || []) as Comment[];
  const responses = (responsesRes.data || [])
    .map((r) => {
      const entity = r.entities as { name?: string; slug?: string } | null;
      return hydrateResponse({ ...r, entity_name: entity?.name, entity_slug: entity?.slug });
    })
    .sort((a, b) => a.entity_name.localeCompare(b.entity_name));
  const reactions = (reactionsRes.data || []).map((r) => {
    const entity = r.entities as { name?: string } | null;
    const { entities: _drop, ...rest } = r;
    return { ...rest, entity_name: entity?.name || '' } as Reaction;
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <ReportDocument
        debrief={debrief}
        comments={comments}
        responses={responses}
        reactions={reactions}
      />
    </main>
  );
}
