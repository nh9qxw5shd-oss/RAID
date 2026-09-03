import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { getSession, requireControl } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Control sees everything; everyone else sees published debriefs only. */
export async function GET() {
  try {
    const session = getSession();
    const sb = serviceClient();
    let q = sb.from('debriefs').select('*');
    if (session?.isControl) {
      q = q.order('updated_at', { ascending: false });
    } else {
      q = q.eq('status', 'published').order('published_at', { ascending: false });
    }
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ debriefs: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

/** Control-only — create a new draft. */
export async function POST(req: NextRequest) {
  try {
    requireControl();
    const seed = await req.json().catch(() => ({}));
    const sb = serviceClient();
    const { data, error } = await sb
      .from('debriefs')
      .insert({
        ref: seed.ref || '',
        tda_ref: seed.tda_ref || '',
        minutes_ref: seed.minutes_ref || '',
        full_cancellations: seed.full_cancellations || '',
        part_cancellations: seed.part_cancellations || '',
        title: seed.title || '',
        incident_date: seed.incident_date || null,
        incident_time: seed.incident_time || '',
        incident_type: seed.incident_type || '',
        location: seed.location || '',
        summary: seed.summary || '',
        content: seed.content || { actions: [], inactions: [], directives: [] },
        status: 'draft',
        author: seed.author || '',
        organisation: seed.organisation || '',
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ debrief: data });
  } catch (err) {
    return jsonError(err);
  }
}
