import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { hashPasscode, requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

/** Control-only — set/rotate an entity's passcode or toggle it active. */
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (body.passcode !== undefined) {
      if (typeof body.passcode !== 'string' || !/^\d{4}$/.test(body.passcode)) {
        throw new HttpError(400, 'Passcode must be exactly 4 digits.');
      }
      patch.passcode_hash = hashPasscode(params.slug, body.passcode);
    }
    if (body.active !== undefined) {
      if (params.slug === 'control' && body.active === false) {
        throw new HttpError(400, 'Control cannot be deactivated.');
      }
      patch.active = !!body.active;
    }
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'Nothing to update.');

    const sb = serviceClient();
    const { data, error } = await sb
      .from('entities')
      .update(patch)
      .eq('slug', params.slug)
      .select('id, slug, name, is_control, active, sort_order, passcode_hash')
      .single();
    if (error || !data) throw new HttpError(404, 'Unknown organisation.');

    return NextResponse.json({
      entity: {
        id: data.id,
        slug: data.slug,
        name: data.name,
        is_control: data.is_control,
        active: data.active,
        sort_order: data.sort_order,
        has_passcode: !!data.passcode_hash,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
