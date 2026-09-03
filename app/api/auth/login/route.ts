import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { hashPasscode, setSessionCookie } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';
import { Session } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { slug, passcode } = await req.json().catch(() => ({}));
    if (typeof slug !== 'string' || !slug) throw new HttpError(400, 'Select an organisation.');
    if (typeof passcode !== 'string' || !/^\d{4}$/.test(passcode)) {
      throw new HttpError(400, 'Enter your organisation’s 4-digit passcode.');
    }

    const sb = serviceClient();
    const { data: entity, error } = await sb
      .from('entities')
      .select('id, slug, name, is_control, active, passcode_hash')
      .eq('slug', slug)
      .single();
    if (error || !entity || !entity.active) throw new HttpError(401, 'Unknown organisation.');
    if (!entity.passcode_hash) {
      throw new HttpError(401, 'No passcode has been set for this organisation yet — contact Control.');
    }
    if (entity.passcode_hash !== hashPasscode(entity.slug, passcode)) {
      throw new HttpError(401, 'Incorrect passcode.');
    }

    const session: Session = {
      entityId: entity.id,
      slug: entity.slug,
      name: entity.name,
      isControl: entity.is_control,
    };
    const res = NextResponse.json({ session });
    setSessionCookie(res, session);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
