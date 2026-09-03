import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Public — backs the sign-in picker and the Control entity panel. The
 * plaintext passcode is included ONLY for Control sessions so Control can
 * advise stakeholders of their code; everyone else receives has_passcode
 * only.
 */
export async function GET() {
  try {
    const isControl = !!getSession()?.isControl;
    const sb = serviceClient();
    const { data, error } = await sb
      .from('entities')
      .select('id, slug, name, is_control, active, sort_order, passcode_hash, passcode')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const entities = (data || []).map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      is_control: e.is_control,
      active: e.active,
      sort_order: e.sort_order,
      has_passcode: !!e.passcode_hash,
      ...(isControl ? { passcode: e.passcode ?? undefined } : {}),
    }));
    return NextResponse.json({ entities }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}
