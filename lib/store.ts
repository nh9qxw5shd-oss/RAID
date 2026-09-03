'use client';

import { isSupabaseConfigured } from './supabase';
import { uid, nowIso } from './format';
import { hydrateDebrief as hydrate, hydrateResponse } from './hydrate';
import {
  Debrief,
  Comment,
  Entity,
  EntityResponse,
  EntityResponseContent,
  PublishEmailResult,
  Reaction,
  Recipient,
  Session,
  emptyContent,
} from './types';

// ════════════════════════════════════════════════════════════════════════
//  Data store
//
//  Server mode (Supabase configured): every read/write goes through the
//  Next.js API routes. Writes are authorised there via the signed entity
//  session cookie — the browser never talks to the database directly, so
//  no entity can act as another regardless of what the client sends.
//
//  Local mode (no backend): everything lives in browser localStorage so
//  the tool stays fully usable for demos. Entity sign-in is simulated
//  (passcodes are not enforced — there is no server to enforce them).
// ════════════════════════════════════════════════════════════════════════

const LS_DEBRIEFS = 'idb.debriefs';
const LS_COMMENTS = 'idb.comments';
const LS_SESSION = 'idb.session';
const LS_RESPONSES = 'idb.responses';
const LS_REACTIONS = 'idb.reactions';
const LS_DISTRIBUTION = 'idb.distribution';

const serverMode = (): boolean => isSupabaseConfigured();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(
  path: string,
  init?: Omit<RequestInit, 'body'> & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    // Never let the browser or an intermediate cache serve a stale API read.
    cache: 'no-store',
    ...rest,
    ...(json !== undefined
      ? { headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) }, body: JSON.stringify(json) }
      : {}),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(res.status, (body.error as string) || `Request failed (${res.status})`);
  }
  return body as T;
}

// ─── localStorage helpers ───────────────────────────────────────────────
function lsRead<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function lsWrite<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function lsReadObj<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsWriteObj<T>(key: string, value: T | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, JSON.stringify(value));
}

// ════════════════════════════════════════════════════════════════════════
//  Entities & sessions
// ════════════════════════════════════════════════════════════════════════

/** Local-mode stand-in for the seeded entities table. */
const LOCAL_ENTITIES: Entity[] = [
  { slug: 'control', name: 'Control', is_control: true, sort_order: 0 },
  { slug: 'ops', name: 'Ops', is_control: false, sort_order: 10 },
  { slug: 'maintenance', name: 'Maintenance', is_control: false, sort_order: 20 },
  { slug: 'emr', name: 'EMR', is_control: false, sort_order: 30 },
  { slug: 'gtr', name: 'GTR', is_control: false, sort_order: 40 },
  { slug: 'xc', name: 'XC', is_control: false, sort_order: 50 },
  { slug: 'nt', name: 'NT', is_control: false, sort_order: 60 },
  { slug: 'lner', name: 'LNER', is_control: false, sort_order: 70 },
  { slug: 'outside-parties', name: 'Outside Parties', is_control: false, sort_order: 80 },
  { slug: 'jpt', name: 'JPT', is_control: false, sort_order: 90 },
].map((e) => ({ ...e, id: `local-${e.slug}`, active: true, has_passcode: true }));

export async function listEntities(): Promise<Entity[]> {
  if (serverMode()) {
    return (await api<{ entities: Entity[] }>('/entities')).entities;
  }
  return LOCAL_ENTITIES;
}

export async function fetchSession(): Promise<Session | null> {
  if (serverMode()) {
    return (await api<{ session: Session | null }>('/auth/session')).session;
  }
  return lsReadObj<Session>(LS_SESSION);
}

export async function login(slug: string, passcode: string): Promise<Session> {
  if (serverMode()) {
    return (await api<{ session: Session }>('/auth/login', { method: 'POST', json: { slug, passcode } }))
      .session;
  }
  const e = LOCAL_ENTITIES.find((x) => x.slug === slug);
  if (!e) throw new ApiError(401, 'Unknown organisation.');
  const session: Session = { entityId: e.id, slug: e.slug, name: e.name, isControl: e.is_control };
  lsWriteObj(LS_SESSION, session);
  return session;
}

export async function logout(): Promise<void> {
  if (serverMode()) {
    await api('/auth/logout', { method: 'POST' });
    return;
  }
  lsWriteObj(LS_SESSION, null);
}

export async function setEntityPasscode(slug: string, passcode: string): Promise<Entity> {
  if (serverMode()) {
    return (await api<{ entity: Entity }>(`/entities/${slug}`, { method: 'PATCH', json: { passcode } }))
      .entity;
  }
  throw new ApiError(400, 'Passcodes are not enforced in local mode.');
}

export async function setEntityActive(slug: string, active: boolean): Promise<Entity> {
  if (serverMode()) {
    return (await api<{ entity: Entity }>(`/entities/${slug}`, { method: 'PATCH', json: { active } }))
      .entity;
  }
  throw new ApiError(400, 'Entities cannot be changed in local mode.');
}

// ════════════════════════════════════════════════════════════════════════
//  Debriefs
// ════════════════════════════════════════════════════════════════════════
export async function listDebriefs(): Promise<Debrief[]> {
  if (serverMode()) {
    const { debriefs } = await api<{ debriefs: Record<string, unknown>[] }>('/debriefs');
    return debriefs.map(hydrate);
  }
  return lsRead<Debrief>(LS_DEBRIEFS).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Published debriefs only — backs the public "Respond" portal. */
export async function listPublishedDebriefs(): Promise<Debrief[]> {
  if (serverMode()) {
    // Non-control sessions (and no session) receive published only.
    const { debriefs } = await api<{ debriefs: Record<string, unknown>[] }>('/debriefs');
    return debriefs.map(hydrate).filter((d) => d.status === 'published');
  }
  return lsRead<Debrief>(LS_DEBRIEFS)
    .filter((d) => d.status === 'published')
    .sort((a, b) =>
      (b.published_at || b.updated_at).localeCompare(a.published_at || a.updated_at),
    );
}

export async function getDebrief(id: string): Promise<Debrief | null> {
  if (serverMode()) {
    try {
      const { debrief } = await api<{ debrief: Record<string, unknown> }>(`/debriefs/${id}`);
      return hydrate(debrief);
    } catch {
      return null;
    }
  }
  return lsRead<Debrief>(LS_DEBRIEFS).find((d) => d.id === id) || null;
}

export async function createDebrief(seed: Partial<Debrief> = {}): Promise<Debrief> {
  if (serverMode()) {
    const { debrief } = await api<{ debrief: Record<string, unknown> }>('/debriefs', {
      method: 'POST',
      json: seed,
    });
    return hydrate(debrief);
  }

  const draft: Debrief = {
    id: uid(),
    ref: seed.ref || '',
    tda_ref: seed.tda_ref || '',
    minutes_ref: seed.minutes_ref || '',
    full_cancellations: seed.full_cancellations || '',
    part_cancellations: seed.part_cancellations || '',
    title: seed.title || '',
    incident_date: seed.incident_date || '',
    incident_time: seed.incident_time || '',
    incident_type: seed.incident_type || '',
    location: seed.location || '',
    summary: seed.summary || '',
    content: seed.content || emptyContent(),
    status: 'draft',
    author: seed.author || '',
    organisation: seed.organisation || '',
    created_at: nowIso(),
    updated_at: nowIso(),
    published_at: null,
  };
  const rows = lsRead<Debrief>(LS_DEBRIEFS);
  rows.unshift(draft);
  lsWrite(LS_DEBRIEFS, rows);
  return draft;
}

export async function updateDebrief(
  id: string,
  patch: Partial<Debrief>,
): Promise<Debrief | null> {
  if (serverMode()) {
    const payload: Record<string, unknown> = { ...patch };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    const { debrief } = await api<{ debrief: Record<string, unknown> }>(`/debriefs/${id}`, {
      method: 'PATCH',
      json: payload,
    });
    return hydrate(debrief);
  }

  const rows = lsRead<Debrief>(LS_DEBRIEFS);
  const idx = rows.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch, id, updated_at: nowIso() };
  lsWrite(LS_DEBRIEFS, rows);
  return rows[idx];
}

/**
 * Publish, then send the emailed notice (report PDF attached) to the
 * distribution list. `recipientIds` narrows the send to a subset of active
 * recipients; omitted = all active.
 */
export async function publishDebrief(
  id: string,
  recipientIds?: string[],
): Promise<{ debrief: Debrief | null; email: PublishEmailResult | null }> {
  if (serverMode()) {
    const { debrief, email } = await api<{
      debrief: Record<string, unknown>;
      email: PublishEmailResult;
    }>(`/debriefs/${id}/publish`, { method: 'POST', json: { recipientIds } });
    return { debrief: hydrate(debrief), email };
  }
  const debrief = await updateDebrief(id, { status: 'published', published_at: nowIso() });
  return { debrief, email: null };
}

export async function revertToDraft(id: string): Promise<Debrief | null> {
  return updateDebrief(id, { status: 'draft', published_at: null });
}

export async function deleteDebrief(id: string): Promise<void> {
  if (serverMode()) {
    await api(`/debriefs/${id}`, { method: 'DELETE' });
    return;
  }
  lsWrite(
    LS_DEBRIEFS,
    lsRead<Debrief>(LS_DEBRIEFS).filter((d) => d.id !== id),
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Comments
// ════════════════════════════════════════════════════════════════════════
/** Fetch every comment on a debrief regardless of directive_id — used for PDF rendering. */
export async function listAllComments(debriefId: string): Promise<Comment[]> {
  if (serverMode()) {
    return (await api<{ comments: Comment[] }>(`/debriefs/${debriefId}/comments`)).comments;
  }
  return lsRead<Comment>(LS_COMMENTS)
    .filter((c) => c.debrief_id === debriefId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listComments(debriefId: string, directiveId?: string): Promise<Comment[]> {
  if (serverMode()) {
    const param = directiveId ? encodeURIComponent(directiveId) : 'null';
    return (
      await api<{ comments: Comment[] }>(`/debriefs/${debriefId}/comments?directive_id=${param}`)
    ).comments;
  }
  return lsRead<Comment>(LS_COMMENTS)
    .filter((c) => {
      if (c.debrief_id !== debriefId) return false;
      return directiveId ? c.directive_id === directiveId : !c.directive_id;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Post commentary as the signed-in entity. The organisation stamp comes
 * from the session (server-side in server mode), never from the caller.
 */
export async function addComment(
  debriefId: string,
  author: string,
  body: string,
  directiveId?: string,
): Promise<Comment> {
  if (serverMode()) {
    return (
      await api<{ comment: Comment }>(`/debriefs/${debriefId}/comments`, {
        method: 'POST',
        json: { author, body, directiveId },
      })
    ).comment;
  }

  const session = lsReadObj<Session>(LS_SESSION);
  if (!session) throw new ApiError(401, 'Sign in as your organisation first.');
  const comment: Comment = {
    id: uid(),
    debrief_id: debriefId,
    ...(directiveId ? { directive_id: directiveId } : {}),
    author: author || 'Anonymous',
    organisation: session.name,
    entity_id: session.entityId,
    entity_name: session.name,
    body,
    created_at: nowIso(),
  };
  const rows = lsRead<Comment>(LS_COMMENTS);
  rows.push(comment);
  lsWrite(LS_COMMENTS, rows);
  return comment;
}

// ════════════════════════════════════════════════════════════════════════
//  Entity responses (viewpoints)
// ════════════════════════════════════════════════════════════════════════
/** Submitted viewpoints from every entity, plus the caller's own draft (if any). */
export async function listResponses(debriefId: string): Promise<EntityResponse[]> {
  if (serverMode()) {
    const { responses } = await api<{ responses: Record<string, unknown>[] }>(
      `/debriefs/${debriefId}/responses`,
    );
    return responses.map(hydrateResponse);
  }
  const session = lsReadObj<Session>(LS_SESSION);
  return lsRead<EntityResponse>(LS_RESPONSES)
    .filter(
      (r) =>
        r.debrief_id === debriefId &&
        (r.status === 'submitted' || r.entity_id === session?.entityId),
    )
    .sort((a, b) => a.entity_name.localeCompare(b.entity_name));
}

/** Create/update the signed-in entity's own viewpoint; optionally submit it. */
export async function saveMyResponse(
  debriefId: string,
  content: EntityResponseContent,
  submit: boolean,
): Promise<EntityResponse> {
  if (serverMode()) {
    const { response } = await api<{ response: Record<string, unknown> }>(
      `/debriefs/${debriefId}/responses`,
      { method: 'PUT', json: { content, submit } },
    );
    return hydrateResponse(response);
  }

  const session = lsReadObj<Session>(LS_SESSION);
  if (!session) throw new ApiError(401, 'Sign in as your organisation first.');
  const rows = lsRead<EntityResponse>(LS_RESPONSES);
  const idx = rows.findIndex((r) => r.debrief_id === debriefId && r.entity_id === session.entityId);
  const existing = idx >= 0 ? rows[idx] : null;
  const next: EntityResponse = {
    id: existing?.id || uid(),
    debrief_id: debriefId,
    entity_id: session.entityId,
    entity_name: session.name,
    entity_slug: session.slug,
    content,
    status: submit ? 'submitted' : existing?.status === 'submitted' ? 'submitted' : 'draft',
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
    submitted_at: submit ? nowIso() : existing?.submitted_at || null,
  };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  lsWrite(LS_RESPONSES, rows);
  return next;
}

// ════════════════════════════════════════════════════════════════════════
//  Point reactions
// ════════════════════════════════════════════════════════════════════════
export async function listReactions(debriefId: string): Promise<Reaction[]> {
  if (serverMode()) {
    return (await api<{ reactions: Reaction[] }>(`/debriefs/${debriefId}/reactions`)).reactions;
  }
  return lsRead<Reaction>(LS_REACTIONS).filter((r) => r.debrief_id === debriefId);
}

/**
 * Set (or clear, with null) the signed-in entity's reaction to a point.
 * Returns the debrief's full reaction set so callers can refresh in place.
 */
export async function setReaction(
  debriefId: string,
  pointId: string,
  reaction: 'up' | 'down' | null,
): Promise<Reaction[]> {
  if (serverMode()) {
    return (
      await api<{ reactions: Reaction[] }>(`/debriefs/${debriefId}/reactions`, {
        method: 'PUT',
        json: { pointId, reaction },
      })
    ).reactions;
  }

  const session = lsReadObj<Session>(LS_SESSION);
  if (!session) throw new ApiError(401, 'Sign in as your organisation first.');
  let rows = lsRead<Reaction>(LS_REACTIONS).filter(
    (r) => !(r.point_id === pointId && r.entity_id === session.entityId),
  );
  if (reaction) {
    rows = [
      ...rows,
      {
        id: uid(),
        debrief_id: debriefId,
        point_id: pointId,
        entity_id: session.entityId,
        entity_name: session.name,
        reaction,
        created_at: nowIso(),
      },
    ];
  }
  lsWrite(LS_REACTIONS, rows);
  return rows.filter((r) => r.debrief_id === debriefId);
}

// ════════════════════════════════════════════════════════════════════════
//  Distribution list
// ════════════════════════════════════════════════════════════════════════
export async function listRecipients(): Promise<Recipient[]> {
  if (serverMode()) {
    return (await api<{ recipients: Recipient[] }>('/distribution')).recipients;
  }
  return lsRead<Recipient>(LS_DISTRIBUTION).sort((a, b) => a.email.localeCompare(b.email));
}

export async function addRecipient(name: string, email: string): Promise<Recipient> {
  if (serverMode()) {
    return (
      await api<{ recipient: Recipient }>('/distribution', { method: 'POST', json: { name, email } })
    ).recipient;
  }
  const r: Recipient = { id: uid(), name, email, active: true, created_at: nowIso() };
  lsWrite(LS_DISTRIBUTION, [...lsRead<Recipient>(LS_DISTRIBUTION), r]);
  return r;
}

export async function updateRecipient(
  id: string,
  patch: Partial<Pick<Recipient, 'name' | 'email' | 'active'>>,
): Promise<Recipient | null> {
  if (serverMode()) {
    return (
      await api<{ recipient: Recipient }>(`/distribution/${id}`, { method: 'PATCH', json: patch })
    ).recipient;
  }
  const rows = lsRead<Recipient>(LS_DISTRIBUTION);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch, id };
  lsWrite(LS_DISTRIBUTION, rows);
  return rows[idx];
}

export async function deleteRecipient(id: string): Promise<void> {
  if (serverMode()) {
    await api(`/distribution/${id}`, { method: 'DELETE' });
    return;
  }
  lsWrite(
    LS_DISTRIBUTION,
    lsRead<Recipient>(LS_DISTRIBUTION).filter((r) => r.id !== id),
  );
}
