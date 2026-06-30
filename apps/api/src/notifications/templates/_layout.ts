/**
 * Shared HTML layout for all notification emails. Mirrors the inline style
 * of the typed transactional emails in @kairos/utils/mailer for consistency.
 */

export interface LayoutInput {
  heading: string;
  greeting?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerLine?: string;
}

export function renderLayout(input: LayoutInput): string {
  const greeting = input.greeting ? `<p>Hi ${escapeHtml(input.greeting)},</p>` : '';
  const cta = input.cta
    ? `
      <p style="text-align: center; margin: 32px 0;">
        <a href="${escapeHtmlAttr(input.cta.url)}"
           style="background:#5D3FD3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
          ${escapeHtml(input.cta.label)}
        </a>
      </p>`
    : '';
  const footer = input.footerLine
    ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(input.footerLine)}</p>`
    : `<p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>`;

  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #5D3FD3;">${escapeHtml(input.heading)}</h2>
      ${greeting}
      ${input.bodyHtml}
      ${cta}
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
      ${footer}
    </div>
  `;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}
