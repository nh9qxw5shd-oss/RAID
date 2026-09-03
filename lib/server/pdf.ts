import { signPrintToken } from './auth';

/**
 * Render the report PDF by pointing headless Chromium at the token-gated
 * /print/[id] page — the same ReportDocument markup and print CSS as the
 * in-browser "Download PDF", so the emailed copy is identical.
 *
 * Uses @sparticuz/chromium (a serverless Chromium build) so it works on a
 * Vercel function; set PDF_CHROMIUM_PATH to use a locally installed
 * Chromium in development instead.
 */
export async function renderReportPdf(debriefId: string, origin: string): Promise<Buffer> {
  const { chromium } = await import('playwright-core');
  const sparticuz = (await import('@sparticuz/chromium')).default;

  const executablePath = process.env.PDF_CHROMIUM_PATH || (await sparticuz.executablePath());
  const browser = await chromium.launch({
    args: sparticuz.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const token = signPrintToken(debriefId);
    const url = `${origin}/print/${debriefId}?token=${encodeURIComponent(token)}`;
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!res || !res.ok()) {
      throw new Error(`Print page returned ${res ? res.status() : 'no response'}`);
    }
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
