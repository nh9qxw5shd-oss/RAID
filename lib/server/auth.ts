import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Session } from '../types';
import { HttpError } from './http';

export const SESSION_COOKIE = 'raid_session';
const SESSION_TTL_S = 12 * 60 * 60; // 12 hours

/**
 * HMAC secret for session cookies and print tokens. Set AUTH_SECRET
 * explicitly; otherwise one is derived from the service role key so a
 * standard Supabase + Vercel setup works with no extra configuration.
 */
function secret(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit) return explicit;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) {
    throw new HttpError(503, 'Backend not configured — set SUPABASE_SERVICE_ROLE_KEY or AUTH_SECRET.');
  }
  return createHash('sha256').update(`raid-auth:${service}`).digest('hex');
}

/** Passcodes are stored as sha256(slug:code) — see migration 003 seed. */
export function hashPasscode(slug: string, code: string): string {
  return createHash('sha256').update(`${slug}:${code}`).digest('hex');
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(data: string): string {
  return b64url(createHmac('sha256', secret()).update(data).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

interface TokenPayload extends Session {
  exp: number; // unix seconds
}

export function encodeSessionToken(session: Session): string {
  const payload: TokenPayload = { ...session, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

export function decodeSessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    if (!safeEqual(sig, sign(body))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64').toString()) as TokenPayload;
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    const { entityId, slug, name, isControl } = payload;
    if (!entityId || !slug) return null;
    return { entityId, slug, name, isControl: !!isControl };
  } catch {
    return null;
  }
}

/** Current session from the request cookie, or null. */
export function getSession(): Session | null {
  return decodeSessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export function requireSession(): Session {
  const s = getSession();
  if (!s) throw new HttpError(401, 'Sign in as your organisation first.');
  return s;
}

export function requireControl(): Session {
  const s = requireSession();
  if (!s.isControl) throw new HttpError(403, 'This action is restricted to Control.');
  return s;
}

export function setSessionCookie(res: NextResponse, session: Session): void {
  res.cookies.set(SESSION_COOKIE, encodeSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_S,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

// ─── Print tokens ───────────────────────────────────────────────────────
// Short-lived capability tokens letting the headless PDF renderer open
// /print/[id] without a session cookie.

export function signPrintToken(debriefId: string, ttlSeconds = 600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${debriefId}:${exp}`;
  return `${exp}.${sign(body)}`;
}

export function verifyPrintToken(debriefId: string, token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const exp = Number(token.slice(0, dot));
  if (!exp || exp < Date.now() / 1000) return false;
  return safeEqual(token.slice(dot + 1), sign(`${debriefId}:${exp}`));
}
