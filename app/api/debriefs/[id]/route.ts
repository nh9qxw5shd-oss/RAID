import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { getSession, requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Published debriefs are readable by anyone; drafts by Control only. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = serviceClient();
    const { data, error } = await sb.from('debriefs').select('*').eq('id', params.id).single();
    if (error || !data) throw new HttpError(404, 'Debrief not found.');
    if (data.status !== 'published' && !getSession()?.isControl) {
      throw new HttpError(404, 'Debrief not found.');
    }
    return NextResponse.json({ debrief: data });
  } catch (err) {
    return jsonError(err);
  }
}

const EDITABLE_FIELDS = [
  'ref', 'tda_ref', 'minutes_ref', 'cancellation_ref', 'title', 'incident_date',
  'incident_time', 'incident_type', 'location', 'summary', 'content', 'author',
  'organisation', 'status', 'published_at',
] as const;

/** Control-only — edit a debrief (including revert to draft via status). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    for (const f of EDITABLE_FIELDS) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (patch.incident_date === '') patch.incident_date = null;
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'Nothing to update.');

    const sb = serviceClient();
    const { data, error } = await sb
      .from('debriefs')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error || !data) throw new HttpError(404, 'Debrief not found.');
    return NextResponse.json({ debrief: data });
  } catch (err) {
    return jsonError(err);
  }
}

/** Control-only — delete a draft. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const sb = serviceClient();
    const { error } = await sb.from('debriefs').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
