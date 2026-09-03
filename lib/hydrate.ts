import { nowIso } from './format';
import {
  Debrief,
  DebriefContent,
  EntityResponse,
  EntityResponseContent,
  emptyContent,
  emptyIlrReview,
  emptyResponseContent,
} from './types';

// Shared row → typed-object hydration, usable from both the client store
// and server components (e.g. the /print page).

export function normaliseContent(c: unknown): DebriefContent {
  const base = emptyContent();
  if (!c || typeof c !== 'object') return base;
  const obj = c as Partial<DebriefContent>;
  return {
    actions: Array.isArray(obj.actions) ? obj.actions : [],
    inactions: Array.isArray(obj.inactions) ? obj.inactions : [],
    directives: Array.isArray(obj.directives) ? obj.directives : [],
    ilrReview: obj.ilrReview ?? emptyIlrReview(),
  };
}

export function hydrateDebrief(row: Record<string, unknown>): Debrief {
  return {
    id: String(row.id),
    ref: (row.ref as string) || '',
    tda_ref: (row.tda_ref as string) || '',
    minutes_ref: (row.minutes_ref as string) || '',
    cancellation_ref: (row.cancellation_ref as string) || '',
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

export function normaliseResponseContent(c: unknown): EntityResponseContent {
  const base = emptyResponseContent();
  if (!c || typeof c !== 'object') return base;
  const obj = c as Partial<EntityResponseContent>;
  return {
    actions: Array.isArray(obj.actions) ? obj.actions : [],
    inactions: Array.isArray(obj.inactions) ? obj.inactions : [],
    narrative: typeof obj.narrative === 'string' ? obj.narrative : '',
  };
}

export function hydrateResponse(row: Record<string, unknown>): EntityResponse {
  return {
    id: String(row.id),
    debrief_id: String(row.debrief_id),
    entity_id: String(row.entity_id),
    entity_name: (row.entity_name as string) || '',
    entity_slug: (row.entity_slug as string) || '',
    content: normaliseResponseContent(row.content),
    status: (row.status as EntityResponse['status']) || 'draft',
    created_at: (row.created_at as string) || nowIso(),
    updated_at: (row.updated_at as string) || nowIso(),
    submitted_at: (row.submitted_at as string) || null,
  };
}
