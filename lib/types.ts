// ─── Incident Debrief — shared types ────────────────────────────────────

export type DebriefStatus = 'draft' | 'published';

export const INCIDENT_TYPES = [
  'Infrastructure Fault',
  'Possession Overrun',
  'Weather Event',
  'Safety Event',
  'Train Fault',
  'Irregularity',
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

// ─── ILR Stage 1 Review ─────────────────────────────────────────────────

/** A single yes/no answer with optional comment and question-specific extras. */
export interface IlrAnswer {
  answer: 'yes' | 'no' | null;
  comment: string;
  /** Q2 only — named disruption level (e.g. "Level 2") */
  level?: string;
  /** Q2 only — whether the incident was escalated */
  escalated?: 'yes' | 'no' | null;
  /** Q4 only — time the first huddle was held */
  huddleTime?: string;
  /** Q4 only — whether further huddles were held */
  furtherHuddles?: 'yes' | 'no' | null;
}

/** ILR Process: Stage 1 Review — five standard questions. */
export interface IlrReview {
  /** Did you follow Disruption Management principles? */
  q1: IlrAnswer;
  /** Did you classify the Level of Disruption and escalate if required? */
  q2: IlrAnswer;
  /** Did you agree Service Containment via TRC within 10 minutes? */
  q3: IlrAnswer;
  /** Did you hold a first Huddle, and further Huddles if required? */
  q4: IlrAnswer;
  /** Were there any communications concerns during the incident? */
  q5: IlrAnswer;
}

export function emptyIlrAnswer(): IlrAnswer {
  return { answer: null, comment: '' };
}

export function emptyIlrReview(): IlrReview {
  return {
    q1: emptyIlrAnswer(),
    q2: { answer: null, comment: '', level: '', escalated: null },
    q3: emptyIlrAnswer(),
    q4: { answer: null, comment: '', huddleTime: '', furtherHuddles: null },
    q5: emptyIlrAnswer(),
  };
}

/** The RAID body, stored as JSONB on the debrief row. */
export interface DebriefContent {
  actions: Point[];
  inactions: Point[];
  directives: Directive[];
  ilrReview?: IlrReview;
}

export interface Debrief {
  id: string;
  ref: string;
  tda_ref: string;
  minutes_ref: string;
  cancellation_ref: string;
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
  directive_id?: string;
  author: string;
  organisation: string;
  /** Entity stamp — set server-side from the session; never client-supplied. */
  entity_id?: string;
  entity_name?: string;
  body: string;
  created_at: string;
}

// ─── Multi-entity feedback ──────────────────────────────────────────────

/** An organisation that can sign in with its shared 4-digit passcode. */
export interface Entity {
  id: string;
  slug: string;
  name: string;
  is_control: boolean;
  active: boolean;
  sort_order: number;
  /** Whether a passcode has been set — the code itself is never exposed. */
  has_passcode: boolean;
}

/** The signed-in entity, as reported by the session cookie. */
export interface Session {
  entityId: string;
  slug: string;
  name: string;
  isControl: boolean;
}

/** An entity's structured viewpoint — mirrors the RAID shape. */
export interface EntityResponseContent {
  actions: Point[];
  inactions: Point[];
  narrative: string;
}

export interface EntityResponse {
  id: string;
  debrief_id: string;
  entity_id: string;
  entity_name: string;
  entity_slug: string;
  content: EntityResponseContent;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

export function emptyResponseContent(): EntityResponseContent {
  return { actions: [], inactions: [], narrative: '' };
}

/** One thumb up/down per entity per point. */
export interface Reaction {
  id: string;
  debrief_id: string;
  point_id: string;
  entity_id: string;
  entity_name: string;
  reaction: 'up' | 'down';
  created_at: string;
}

/** A publish-notice email recipient. */
export interface Recipient {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
}

/** Outcome of the publish email fan-out, reported back to the UI. */
export interface PublishEmailResult {
  attempted: number;
  sent: number;
  pdfAttached: boolean;
  error?: string;
}

export function emptyContent(): DebriefContent {
  return { actions: [], inactions: [], directives: [] };
}
