import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server/db';
import { requireControl } from '@/lib/server/auth';
import { HttpError, jsonError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    requireControl();
    const sb = serviceClient();
    const { data, error } = await sb
      .from('distribution_list')
      .select('id, name, email, active, created_at')
      .order('email', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ recipients: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireControl();
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
    const sb = serviceClient();
    const { data, error } = await sb
      .from('distribution_list')
      .insert({ email, name: typeof body.name === 'string' ? body.name.trim() : '' })
      .select('id, name, email, active, created_at')
      .single();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'That email is already on the list.');
      throw error;
    }
    return NextResponse.json({ recipient: data });
  } catch (err) {
    return jsonError(err);
  }
}
