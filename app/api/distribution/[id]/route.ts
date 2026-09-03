import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string') patch.name = body.name.trim();
    if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase();
    if (typeof body.active === 'boolean') patch.active = body.active;
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'Nothing to update.');
    const sb = serviceClient();
    const { data, error } = await sb
      .from('distribution_list')
      .update(patch)
      .eq('id', params.id)
      .select('id, name, email, active, created_at')
      .single();
    if (error || !data) throw new HttpError(404, 'Recipient not found.');
    return NextResponse.json({ recipient: data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireControl();
    const sb = serviceClient();
    const { error } = await sb.from('distribution_list').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
