import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // PDF render + email fan-out

/** Control-only — publish-notice send history for a debrief, newest first. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const { data, error } = await serviceClient()
      .from('publish_notices')
      .select('*')
      .eq('debrief_id', params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ notices: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * Control-only — resend the publish notice for an already-published
 * debrief to the selected distribution-list recipients.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const recipientIds: string[] | undefined = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((r: unknown) => typeof r === 'string')
      : undefined;

    const { data, error } = await serviceClient()
      .from('debriefs')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error || !data) throw new HttpError(404, 'Debrief not found.');
    if (data.status !== 'published') throw new HttpError(409, 'Only published debriefs can be re-sent.');

    const { sendPublishNotice } = await import('@/lib/server/email');
    const email = await sendPublishNotice(data, recipientIds, req.nextUrl.origin, 'resend');
    return NextResponse.json({ email });
  } catch (err) {
    return jsonError(err);
  }
}
