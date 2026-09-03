import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { getSession, requireSession } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';
import { DebriefContent, EntityResponseContent } from '@/lib/types';

export const dynamic = 'force-dynamic';

function flatten(row: Record<string, unknown>): Record<string, unknown> {
  const entity = row.entities as { name?: string } | null;
  const { entities: _drop, ...rest } = row;
  return { ...rest, entity_name: entity?.name || '' };
}

async function listAll(debriefId: string) {
  const sb = serviceClient();
  const { data, error } = await sb
    .from('point_reactions')
    .select('*, entities(name)')
    .eq('debrief_id', debriefId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(flatten);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = serviceClient();
    const { data, error } = await sb
      .from('debriefs')
      .select('id, status')
      .eq('id', params.id)
      .single();
    if (error || !data) throw new HttpError(404, 'Debrief not found.');
    if (data.status !== 'published' && !getSession()?.isControl) {
      throw new HttpError(404, 'Debrief not found.');
    }
    return NextResponse.json({ reactions: await listAll(params.id) });
  } catch (err) {
    return jsonError(err);
  }
}

/** All point ids a reaction may target: Control's action/inaction points plus points in submitted viewpoints. */
async function reactablePointIds(debriefId: string): Promise<Set<string>> {
  const sb = serviceClient();
  const ids = new Set<string>();
  const { data: debrief } = await sb
    .from('debriefs')
    .select('content')
    .eq('id', debriefId)
    .single();
  const content = (debrief?.content || {}) as Partial<DebriefContent>;
  for (const p of [...(content.actions || []), ...(content.inactions || [])]) ids.add(p.id);

  const { data: resps } = await sb
    .from('entity_responses')
    .select('content, status')
    .eq('debrief_id', debriefId)
    .eq('status', 'submitted');
  for (const r of resps || []) {
    const c = (r.content || {}) as Partial<EntityResponseContent>;
    for (const p of [...(c.actions || []), ...(c.inactions || [])]) ids.add(p.id);
  }
  return ids;
}

/**
 * Set or clear the signed-in entity's reaction to one point. One vote per
 * entity per point (DB-enforced); entity identity comes from the session.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const pointId = typeof body.pointId === 'string' ? body.pointId : '';
    const reaction = body.reaction;
    if (!pointId) throw new HttpError(400, 'pointId is required.');
    if (reaction !== 'up' && reaction !== 'down' && reaction !== null) {
      throw new HttpError(400, "reaction must be 'up', 'down', or null.");
    }

    const sb = serviceClient();
    const { data: debrief, error: dErr } = await sb
      .from('debriefs')
      .select('id, status')
      .eq('id', params.id)
      .single();
    if (dErr || !debrief) throw new HttpError(404, 'Debrief not found.');
    if (debrief.status !== 'published') {
      throw new HttpError(400, 'Reactions are only open on published debriefs.');
    }
    if (reaction && !(await reactablePointIds(params.id)).has(pointId)) {
      throw new HttpError(400, 'Unknown point.');
    }

    const { error: delErr } = await sb
      .from('point_reactions')
      .delete()
      .eq('point_id', pointId)
      .eq('entity_id', session.entityId);
    if (delErr) throw delErr;

    if (reaction) {
      const { error: insErr } = await sb.from('point_reactions').insert({
        debrief_id: params.id,
        point_id: pointId,
        entity_id: session.entityId,
        reaction,
      });
      if (insErr) throw insErr;
    }

    return NextResponse.json({ reactions: await listAll(params.id) });
  } catch (err) {
    return jsonError(err);
  }
}
