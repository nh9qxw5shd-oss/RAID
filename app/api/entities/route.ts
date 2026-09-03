import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Public — backs the sign-in picker and the Control entity panel. */
export async function GET() {
  try {
    const sb = serviceClient();
    const { data, error } = await sb
      .from('entities')
      .select('id, slug, name, is_control, active, sort_order, passcode_hash')
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
    }));
    return NextResponse.json({ entities });
  } catch (err) {
    return jsonError(err);
  }
}
