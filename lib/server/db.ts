import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http';

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key. It bypasses RLS —
 * every route handler is responsible for its own authorisation via the
 * signed session cookie (see ./auth). The service key must never reach the
 * browser; it is read only inside route handlers.
 */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(
      503,
      'Backend not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  if (!_client) {
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}
