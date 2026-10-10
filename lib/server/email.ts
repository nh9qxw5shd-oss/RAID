import { randomUUID } from 'crypto';
import { serviceClient } from './db';
import { PublishEmailResult } from '../types';
import { appUrl } from '../basePath';

// Resend rejects any single email with more than 50 addresses in to/cc/bcc
// (422 validation_error). Recipients are sent in BCC chunks of this size so
// the list can grow without breaking, and so recipients — who span Network
// Rail, TOCs, FOCs and BTP — never see each other's addresses. The batch
// endpoint is not used because it does not support attachments.
const MAX_RECIPIENTS_PER_EMAIL = 50;
// The Resend account's request rate limit is shared with other apps, so a
// 429 (or a transient 5xx) is retried with backoff rather than failing the send.
const MAX_SEND_ATTEMPTS = 4;
// Keep the PDF render well inside the route's 60s budget so the notice
// always goes out, link-only if Chromium is slow.
const PDF_RENDER_TIMEOUT_MS = 25_000;
// Stop retrying in time to record and report the outcome before the route's
// 60s limit kills the function silently.
const SEND_DEADLINE_MS = 50_000;

interface DebriefRow {
  id: string;
  ref: string | null;
  title: string | null;
  incident_type: string | null;
  incident_date: string | null;
  incident_time: string | null;
  location: string | null;
}

/**
 * Email the publish notice (with the report PDF when it can be rendered)
 * to the distribution list via Resend, and record the outcome in
 * publish_notices. Email failure never blocks the publish itself — the
 * outcome is reported back to the UI instead.
 */
export async function sendPublishNotice(
  debrief: DebriefRow,
  recipientIds: string[] | undefined,
  origin: string,
  kind: 'publish' | 'resend' = 'publish',
): Promise<PublishEmailResult> {
  const result = await deliverNotice(debrief, recipientIds, origin);
  await recordNotice(debrief.id, kind, result);
  return result;
}

async function deliverNotice(
  debrief: DebriefRow,
  recipientIds: string[] | undefined,
  origin: string,
): Promise<PublishEmailResult> {
  const none: PublishEmailResult = { attempted: 0, sent: 0, pdfAttached: false };
  const deadline = Date.now() + SEND_DEADLINE_MS;

  let recipients: Array<{ id: string; email: string }>;
  try {
    const sb = serviceClient();
    let q = sb.from('distribution_list').select('id, email').eq('active', true);
    if (recipientIds) q = q.in('id', recipientIds);
    const { data, error } = await q;
    if (error) throw error;
    recipients = data || [];
  } catch (err) {
    return { ...none, error: `Could not load distribution list: ${(err as Error).message}` };
  }
  if (recipients.length === 0) return none;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ...none,
      attempted: recipients.length,
      error: 'RESEND_API_KEY is not configured — no emails sent.',
    };
  }

  const respondUrl = appUrl(origin, `/respond/${debrief.id}`);
  const title = debrief.title || 'Untitled incident';

  // PDF attachment — best-effort; the notice still goes out without it.
  let pdf: Buffer | null = null;
  try {
    const { renderReportPdf } = await import('./pdf');
    pdf = await withTimeout(renderReportPdf(debrief.id, origin), PDF_RENDER_TIMEOUT_MS, 'PDF render');
  } catch (err) {
    console.error('[email] PDF render failed, sending link-only notice:', err);
  }

  const metaRow = (label: string, value: string | null) =>
    value
      ? `<tr><td style="padding:2px 12px 2px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${label}</td><td style="padding:2px 0;color:#222;font-size:14px;">${escapeHtml(value)}</td></tr>`
      : '';

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <p style="color:#E05206;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 6px;">RAID Incident Debrief</p>
    <h1 style="font-size:22px;margin:0 0 14px;color:#111;">${escapeHtml(title)}</h1>
    <table style="border-collapse:collapse;margin:0 0 18px;">
      ${metaRow('Ref', debrief.ref)}
      ${metaRow('Type', debrief.incident_type)}
      ${metaRow('Date', debrief.incident_date ? `${debrief.incident_date} ${debrief.incident_time || ''}` : null)}
      ${metaRow('Location', debrief.location)}
    </table>
    <p style="color:#333;font-size:14px;line-height:1.55;margin:0 0 18px;">
      This RAID review has been published by Control${pdf ? ' — the report is attached as a PDF' : ''}.
      To read it online and add your organisation&rsquo;s viewpoint — support or contest
      individual points, answer directives, and leave commentary — use the link below
      or scan the QR code on the report.
    </p>
    <p style="margin:0 0 22px;">
      <a href="${respondUrl}" style="background:#E05206;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:14px;display:inline-block;">Read &amp; respond</a>
    </p>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;">
      You will be asked to sign in with your organisation&rsquo;s 4-digit passcode before contributing.<br/>
      ${respondUrl}
    </p>
  </div>`;

  const from = process.env.RESEND_FROM || 'RAID Debrief <onboarding@resend.dev>';
  const base = {
    from,
    // Resend requires a `to`; the real recipients stay in BCC. Point
    // RESEND_NOTICE_TO at a monitored mailbox (e.g. the Control inbox) to
    // keep a copy of every notice; defaults to the sender address.
    to: [process.env.RESEND_NOTICE_TO || senderAddress(from)],
    subject: `RAID Debrief published — ${title}${debrief.ref ? ` (${debrief.ref})` : ''}`,
    html,
    ...(pdf
      ? {
          attachments: [
            {
              filename: `RAID-${(debrief.ref || debrief.id).replace(/[^\w-]+/g, '_')}.pdf`,
              content: pdf.toString('base64'),
            },
          ],
        }
      : {}),
  };

  // Shared across the chunks of this send so a retried chunk is never
  // delivered twice (Resend Idempotency-Key, valid for 24h).
  const sendId = randomUUID();
  const emails = recipients.map((r) => r.email);
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < emails.length; i += MAX_RECIPIENTS_PER_EMAIL) {
    const chunk = emails.slice(i, i + MAX_RECIPIENTS_PER_EMAIL);
    if (Date.now() >= deadline) {
      errors.push(`recipients ${i + 1}–${emails.length}: not attempted — out of time`);
      break;
    }
    try {
      await postEmail(apiKey, { ...base, bcc: chunk }, `raid-notice-${sendId}-${i}`, deadline);
      sent += chunk.length;
    } catch (err) {
      errors.push(`recipients ${i + 1}–${i + chunk.length}: ${(err as Error).message}`);
    }
  }

  return {
    attempted: emails.length,
    sent,
    pdfAttached: !!pdf,
    ...(errors.length ? { error: `Email send failed for ${emails.length - sent} of ${emails.length} — ${errors.join('; ')}` } : {}),
  };
}

/** POST one email to Resend, retrying rate limits and transient server errors. */
async function postEmail(
  apiKey: string,
  payload: object,
  idempotencyKey: string,
  deadline: number,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    let status = 0;
    let detail = '';
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        // Bound each request by the time left so a hung call can't run the
        // route past its limit before the outcome is recorded.
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      if (res.ok) return;
      status = res.status;
      detail = (await res.text()).slice(0, 300);
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt >= MAX_SEND_ATTEMPTS) {
        throw new Error(`Resend ${status}: ${detail}`);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 500 * 2 ** attempt;
      if (Date.now() + wait > deadline) throw new Error(`Resend ${status} (gave up — out of time): ${detail}`);
      await sleep(wait);
    } catch (err) {
      // Network failure (no status) — retry; HTTP failures were decided above.
      const wait = 500 * 2 ** attempt;
      if (status || attempt >= MAX_SEND_ATTEMPTS || Date.now() + wait >= deadline) throw err;
      await sleep(wait);
    }
  }
}

/** Best-effort audit row — a logging failure must not mask the send outcome. */
async function recordNotice(
  debriefId: string,
  kind: 'publish' | 'resend',
  r: PublishEmailResult,
): Promise<void> {
  try {
    const { error } = await serviceClient().from('publish_notices').insert({
      debrief_id: debriefId,
      kind,
      attempted: r.attempted,
      sent: r.sent,
      pdf_attached: r.pdfAttached,
      error: r.error ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.error('[email] Could not record publish notice:', err);
  }
}

/** Bare address from a "Name <addr>" sender string. */
function senderAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
