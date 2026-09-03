import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { getSession, requireSession } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

async function assertReadable(id: string): Promise<void> {
  const sb = serviceClient();
  const { data, error } = await sb.from('debriefs').select('id, status').eq('id', id).single();
  if (error || !data) throw new HttpError(404, 'Debrief not found.');
  if (data.status !== 'published' && !getSession()?.isControl) {
    throw new HttpError(404, 'Debrief not found.');
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertReadable(params.id);
    const sb = serviceClient();
    const directiveId = req.nextUrl.searchParams.get('directive_id');
    let q = sb
      .from('debrief_comments')
      .select('*')
      .eq('debrief_id', params.id)
      .order('created_at', { ascending: true });
    if (directiveId === 'null') q = q.is('directive_id', null);
    else if (directiveId) q = q.eq('directive_id', directiveId);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * Post commentary as the signed-in entity. The organisation stamp comes from
 * the session, never from the request body, so one entity can never speak
 * for another.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    if (typeof body.body !== 'string' || !body.body.trim()) {
      throw new HttpError(400, 'Comment text is required.');
    }

    const sb = serviceClient();
    const { data: debrief, error: dErr } = await sb
      .from('debriefs')
      .select('id, status')
      .eq('id', params.id)
      .single();
    if (dErr || !debrief) throw new HttpError(404, 'Debrief not found.');
    if (debrief.status !== 'published') {
      throw new HttpError(400, 'Commentary is only open on published debriefs.');
    }

    const { data, error } = await sb
      .from('debrief_comments')
      .insert({
        debrief_id: params.id,
        directive_id: typeof body.directiveId === 'string' ? body.directiveId : null,
        author: typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Anonymous',
        organisation: session.name,
        entity_id: session.entityId,
        entity_name: session.name,
        body: body.body.trim(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data });
  } catch (err) {
    return jsonError(err);
  }
}
