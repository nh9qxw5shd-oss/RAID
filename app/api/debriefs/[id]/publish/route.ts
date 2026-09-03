import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export const maxDuration = 60; // PDF render + email fan-out

/**
 * Control-only — publish a debrief and send the emailed notice (report PDF
 * attached) to the selected distribution-list recipients.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const recipientIds: string[] | undefined = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((r: unknown) => typeof r === 'string')
      : undefined;

    const sb = serviceClient();
    const { data, error } = await sb
      .from('debriefs')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('*')
      .single();
    if (error || !data) throw new HttpError(404, 'Debrief not found.');

    const { sendPublishNotice } = await import('@/lib/server/email');
    const email = await sendPublishNotice(data, recipientIds, req.nextUrl.origin);

    return NextResponse.json({ debrief: data, email });
  } catch (err) {
    return jsonError(err);
  }
}
