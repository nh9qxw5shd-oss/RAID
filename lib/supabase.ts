'use client';

/**
 * Backend detection. When Supabase is configured the app runs in server
 * mode — all data access goes through the Next.js API routes (see
 * lib/store.ts), which hold the service role key server-side. The browser
 * itself never talks to Supabase directly any more; these public env vars
 * simply signal that a backend exists.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
