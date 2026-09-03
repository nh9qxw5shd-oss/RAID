import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ session: getSession() });
  } catch {
    // Backend not configured — report signed-out rather than erroring.
    return NextResponse.json({ session: null });
  }
}
