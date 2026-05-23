'use client';

import { getSupabase } from './supabase';
import { uid, nowIso } from './format';
import {
  Debrief,
  Comment,
  DebriefContent,
  emptyContent,
} from './types';

// ════════════════════════════════════════════════════════════════════════
//  Data store
//  Uses Supabase when configured; otherwise falls back to browser
//  localStorage so the tool is fully usable before any backend is wired up.
// ════════════════════════════════════════════════════════════════════════

const LS_DEBRIEFS = 'idb.debriefs';
const LS_COMMENTS = 'idb.comments';

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

function normaliseContent(c: unknown): DebriefContent {
  const base = emptyContent();
  if (!c || typeof c !== 'object') return base;
  const obj = c as Partial<DebriefContent>;
  return {
    actions: Array.isArray(obj.actions) ? obj.actions : [],
    inactions: Array.isArray(obj.inactions) ? obj.inactions : [],
    directives: Array.isArray(obj.directives) ? obj.directives : [],
  };
}

function hydrate(row: Record<string, unknown>): Debrief {
  return {
    id: String(row.id),
    ref: (row.ref as string) || '',
    title: (row.title as string) || '',
    incident_date: (row.incident_date as string) || '',
    incident_time: (row.incident_time as string) || '',
    incident_type: (row.incident_type as string) || '',
    location: (row.location as string) || '',
    summary: (row.summary as string) || '',
    content: normaliseContent(row.content),
    status: (row.status as Debrief['status']) || 'draft',
    author: (row.author as string) || '',
    organisation: (row.organisation as string) || '',
    created_at: (row.created_at as string) || nowIso(),
    updated_at: (row.updated_at as string) || nowIso(),
    published_at: (row.published_at as string) || null,
  };
}

// ════════════════════════════════════════════════════════════════════════
//  Debriefs
// ════════════════════════════════════════════════════════════════════════
export async function listDebriefs(): Promise<Debrief[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('debriefs')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(hydrate);
  }
  return lsRead<Debrief>(LS_DEBRIEFS).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
}

export async function getDebrief(id: string): Promise<Debrief | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('debriefs').select('*').eq('id', id).single();
    if (error) return null;
    return data ? hydrate(data) : null;
  }
  return lsRead<Debrief>(LS_DEBRIEFS).find((d) => d.id === id) || null;
}

export async function createDebrief(seed: Partial<Debrief> = {}): Promise<Debrief> {
  const draft: Debrief = {
    id: uid(),
    ref: seed.ref || '',
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

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('debriefs')
      .insert({
        ref: draft.ref,
        title: draft.title,
        incident_date: draft.incident_date || null,
        incident_time: draft.incident_time,
        incident_type: draft.incident_type,
        location: draft.location,
        summary: draft.summary,
        content: draft.content,
        status: draft.status,
        author: draft.author,
        organisation: draft.organisation,
      })
      .select('*')
      .single();
    if (error) throw error;
    return hydrate(data);
  }

  const rows = lsRead<Debrief>(LS_DEBRIEFS);
  rows.unshift(draft);
  lsWrite(LS_DEBRIEFS, rows);
  return draft;
}

export async function updateDebrief(
  id: string,
  patch: Partial<Debrief>,
): Promise<Debrief | null> {
  const sb = getSupabase();
  if (sb) {
    const payload: Record<string, unknown> = { ...patch };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    if (payload.incident_date === '') payload.incident_date = null;
    const { data, error } = await sb
      .from('debriefs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return hydrate(data);
  }

  const rows = lsRead<Debrief>(LS_DEBRIEFS);
  const idx = rows.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch, id, updated_at: nowIso() };
  lsWrite(LS_DEBRIEFS, rows);
  return rows[idx];
}

export async function publishDebrief(id: string): Promise<Debrief | null> {
  return updateDebrief(id, {
    status: 'published',
    published_at: nowIso(),
  });
}

export async function revertToDraft(id: string): Promise<Debrief | null> {
  return updateDebrief(id, { status: 'draft', published_at: null });
}

export async function deleteDebrief(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('debriefs').delete().eq('id', id);
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
export async function listComments(debriefId: string, directiveId?: string): Promise<Comment[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb
      .from('debrief_comments')
      .select('*')
      .eq('debrief_id', debriefId)
      .order('created_at', { ascending: true });
    if (directiveId) {
      q = q.eq('directive_id', directiveId);
    } else {
      q = q.is('directive_id', null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Comment[];
  }
  return lsRead<Comment>(LS_COMMENTS)
    .filter((c) => {
      if (c.debrief_id !== debriefId) return false;
      return directiveId ? c.directive_id === directiveId : !c.directive_id;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function addComment(
  debriefId: string,
  author: string,
  organisation: string,
  body: string,
  directiveId?: string,
): Promise<Comment> {
  const comment: Comment = {
    id: uid(),
    debrief_id: debriefId,
    ...(directiveId ? { directive_id: directiveId } : {}),
    author: author || 'Anonymous',
    organisation: organisation || '',
    body,
    created_at: nowIso(),
  };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('debrief_comments')
      .insert({
        debrief_id: debriefId,
        ...(directiveId ? { directive_id: directiveId } : {}),
        author: comment.author,
        organisation: comment.organisation,
        body: comment.body,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Comment;
  }

  const rows = lsRead<Comment>(LS_COMMENTS);
  rows.push(comment);
  lsWrite(LS_COMMENTS, rows);
  return comment;
}
