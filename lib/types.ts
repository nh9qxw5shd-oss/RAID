// ─── Incident Debrief — shared types ────────────────────────────────────

export type DebriefStatus = 'draft' | 'published';

export const INCIDENT_TYPES = [
  'Service Disruption',
  'Possession Overrun',
  'Unplanned Obstruction',
  'Infrastructure Fault',
  'Asset Failure',
  'Signalling Failure',
  'Delay Attribution',
  'Resource Availability',
  'Communications Failure',
  'Safety Event',
  'Other',
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

/** A single bullet under Actions (what worked) or Inactions (gaps). */
export interface Point {
  id: string;
  text: string;
}

export interface DirectiveQuestion {
  id: string;
  text: string;
}

/** A block of questions addressed to a named party, with a required action. */
export interface Directive {
  id: string;
  to: string;
  questions: DirectiveQuestion[];
  directive: string;
}

/** The RAID body, stored as JSONB on the debrief row. */
export interface DebriefContent {
  actions: Point[];
  inactions: Point[];
  directives: Directive[];
}

export interface Debrief {
  id: string;
  ref: string;
  title: string;
  incident_date: string;
  incident_time: string;
  incident_type: string;
  location: string;
  summary: string;
  content: DebriefContent;
  status: DebriefStatus;
  author: string;
  organisation: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Comment {
  id: string;
  debrief_id: string;
  author: string;
  organisation: string;
  body: string;
  created_at: string;
}

export function emptyContent(): DebriefContent {
  return { actions: [], inactions: [], directives: [] };
}
