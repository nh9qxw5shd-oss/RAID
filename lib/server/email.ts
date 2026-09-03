import { serviceClient } from './db';
import { PublishEmailResult } from '../types';

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
 * to the distribution list via Resend. Email failure never blocks the
 * publish itself — the outcome is reported back to the UI instead.
 */
export async function sendPublishNotice(
  debrief: DebriefRow,
  recipientIds: string[] | undefined,
  origin: string,
): Promise<PublishEmailResult> {
  const none: PublishEmailResult = { attempted: 0, sent: 0, pdfAttached: false };

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

  const respondUrl = `${origin}/respond/${debrief.id}`;
  const title = debrief.title || 'Untitled incident';

  // PDF attachment — best-effort; the notice still goes out without it.
  let pdf: Buffer | null = null;
  try {
    const { renderReportPdf } = await import('./pdf');
    pdf = await renderReportPdf(debrief.id, origin);
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

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'RAID Debrief <onboarding@resend.dev>',
        to: recipients.map((r) => r.email),
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
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
    }
    return {
      attempted: recipients.length,
      sent: recipients.length,
      pdfAttached: !!pdf,
    };
  } catch (err) {
    return {
      ...none,
      attempted: recipients.length,
      error: `Email send failed: ${(err as Error).message}`,
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
