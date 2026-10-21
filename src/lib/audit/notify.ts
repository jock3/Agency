import type { AuditAction } from "./types";

/**
 * Mejlar en notis om nya leads via Resend. Utan RESEND_API_KEY händer
 * ingenting — leaden finns ändå i databasen och på /audit.
 *
 * Avsändaren måste vara en domän som är verifierad i Resend. Resends
 * testavsändare (onboarding@resend.dev) får bara skicka till e-posten som äger
 * Resend-kontot.
 */

const TO = process.env.AUDIT_NOTIFY_TO ?? "gustav.mattsson@milou.se";
const FROM = process.env.AUDIT_NOTIFY_FROM ?? "Milou Audit <onboarding@resend.dev>";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface LeadNotice {
  email: string;
  url: string;
  host: string;
  score: number;
  seoScore: number;
  geoScore: number;
  pageCount: number;
  summary: string;
  actions: AuditAction[];
  /** Länk till den interna listan, byggd från anropets origin. */
  adminUrl: string;
}

export async function notifyLead(lead: LeadNotice): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const subject = `Ny lead: ${lead.host} (${lead.score}/10)`;
  const actions = lead.actions.map((a, i) => `${i + 1}. ${a.title} (${a.impact} effekt)`);

  const text = [
    `${lead.email} granskade ${lead.url} och lämnade sin e-post.`,
    "",
    `Betyg: ${lead.score}/10 (SEO ${lead.seoScore}, GEO ${lead.geoScore}) över ${lead.pageCount} sidor.`,
    "",
    lead.summary,
    "",
    ...actions,
    "",
    `Svara på det här mejlet för att skriva direkt till ${lead.email}.`,
    `Alla leads: ${lead.adminUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1c1c1c;max-width:560px">
  <p><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a> granskade
     <a href="${esc(lead.url)}">${esc(lead.host)}</a> och lämnade sin e-post.</p>
  <p style="font-size:28px;font-weight:bold;margin:16px 0 4px">${lead.score}/10</p>
  <p style="color:#6c6c6c;margin:0 0 16px">SEO ${lead.seoScore} · GEO ${lead.geoScore} · ${lead.pageCount} sidor granskade</p>
  <p>${esc(lead.summary)}</p>
  <ol>${lead.actions.map((a) => `<li><b>${esc(a.title)}</b> (${esc(a.impact)} effekt)</li>`).join("")}</ol>
  <p style="color:#6c6c6c">Svara på det här mejlet för att skriva direkt till ${esc(lead.email)}.<br>
     <a href="${esc(lead.adminUrl)}">Alla leads</a></p>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // Svar går direkt till leaden, inte tillbaka till avsändaradressen.
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: lead.email, subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[audit] lead notice failed", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("[audit] lead notice failed", err);
  }
}
