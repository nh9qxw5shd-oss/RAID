import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { serviceClient } from '@/lib/server/db';
import { getSession, requireSession } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';
import { EntityResponseContent, Point } from '@/lib/types';

export const dynamic = 'force-dynamic';

function flatten(row: Record<string, unknown>): Record<string, unknown> {
  const entity = row.entities as { name?: string; slug?: string } | null;
  const { entities: _drop, ...rest } = row;
  return { ...rest, entity_name: entity?.name || '', entity_slug: entity?.slug || '' };
}

async function getPublishedDebrief(id: string) {
  const sb = serviceClient();
  const { data, error } = await sb.from('debriefs').select('id, status').eq('id', id).single();
  if (error || !data) throw new HttpError(404, 'Debrief not found.');
  return data;
}

/**
 * Everyone can read submitted viewpoints (they are part of the published
 * report); the caller additionally receives their own unsubmitted draft.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const debrief = await getPublishedDebrief(params.id);
    const session = getSession();
    if (debrief.status !== 'published' && !session?.isControl) {
      throw new HttpError(404, 'Debrief not found.');
    }

    const sb = serviceClient();
    const { data, error } = await sb
      .from('entity_responses')
      .select('*, entities(name, slug)')
      .eq('debrief_id', params.id);
    if (error) throw error;

    const responses = (data || [])
      .filter((r) => r.status === 'submitted' || r.entity_id === session?.entityId)
      .map(flatten)
      .sort((a, b) => String(a.entity_name).localeCompare(String(b.entity_name)));
    return NextResponse.json({ responses });
  } catch (err) {
    return jsonError(err);
  }
}

function sanitisePoints(raw: unknown): Point[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      id:
        typeof (p as Point).id === 'string' && (p as Point).id.length > 0
          ? (p as Point).id
          : randomUUID(),
      text: typeof (p as Point).text === 'string' ? (p as Point).text : '',
    }))
    .slice(0, 100);
}

/**
 * Upsert the signed-in entity's own viewpoint. entity_id always comes from
 * the session — one entity can never write another's response. Once
 * submitted, further saves keep the submitted status (live corrections);
 * the original submitted_at is preserved.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession();
    const debrief = await getPublishedDebrief(params.id);
    if (debrief.status !== 'published') {
      throw new HttpError(400, 'Viewpoints can only be added to published debriefs.');
    }

    const body = await req.json().catch(() => ({}));
    const raw = (body.content || {}) as Partial<EntityResponseContent>;
    const content: EntityResponseContent = {
      actions: sanitisePoints(raw.actions),
      inactions: sanitisePoints(raw.inactions),
      narrative: typeof raw.narrative === 'string' ? raw.narrative.slice(0, 20_000) : '',
    };
    const submit = !!body.submit;

    const sb = serviceClient();
    const { data: existing } = await sb
      .from('entity_responses')
      .select('id, status, submitted_at')
      .eq('debrief_id', params.id)
      .eq('entity_id', session.entityId)
      .maybeSingle();

    const status = submit || existing?.status === 'submitted' ? 'submitted' : 'draft';
    const submitted_at =
      existing?.submitted_at || (submit ? new Date().toISOString() : null);

    const { data, error } = await sb
      .from('entity_responses')
      .upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          debrief_id: params.id,
          entity_id: session.entityId,
          content,
          status,
          submitted_at,
        },
        { onConflict: 'debrief_id,entity_id' },
      )
      .select('*, entities(name, slug)')
      .single();
    if (error) throw error;
    return NextResponse.json({ response: flatten(data) });
  } catch (err) {
    return jsonError(err);
  }
}
