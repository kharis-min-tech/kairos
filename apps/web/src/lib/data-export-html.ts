import { NOTIFICATION_CATEGORY_LABEL, type NotificationCategory } from '@kairos/types';
import { formatDate, UK_DATE_LOCALE } from '@kairos/core';

/**
 * Turn the /api/me/export payload into a self-contained, printable HTML page.
 *
 * Aimed at non-technical users. The page opens by double-click in any browser
 * and prints straight from the browser (Ctrl-P → Save as PDF) so a paper copy
 * takes no extra tooling. All styles are inline; the file has no external
 * dependencies.
 *
 * The API pre-enriches every row with human-readable names (branch / fellowship
 * / department / meeting) so this file only formats them — it never renders
 * raw UUIDs to the reader. IDs are still present in the JSON export so that
 * portability (GDPR Art. 20) stays intact.
 */

type ExportPayload = {
  exportedAt: string;
  member?: Record<string, unknown> | null;
  consents?: Array<Record<string, unknown>>;
  fellowshipMemberships?: Array<Record<string, unknown>>;
  departmentMemberships?: Array<Record<string, unknown>>;
  serviceAttendance?: Array<Record<string, unknown>>;
  fellowshipMeetingAttendance?: Array<Record<string, unknown>>;
  newBelieverEnrollments?: Array<Record<string, unknown>>;
  formSubmissionsAboutMe?: Array<Record<string, unknown>>;
  notificationPreferences?: Array<Record<string, unknown>>;
};

const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
const LONG_DATE_TIME: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function esc(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function longDate(value: unknown): string {
  if (typeof value !== 'string' && !(value instanceof Date) && typeof value !== 'number') return '—';
  return formatDate(value as string | Date | number, LONG_DATE);
}

function longDateTime(value: unknown): string {
  if (typeof value !== 'string' && !(value instanceof Date) && typeof value !== 'number') return '—';
  return formatDate(value as string | Date | number, LONG_DATE_TIME);
}

function yesNo(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function labelFor(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID');
}

function row(label: string, value: string): string {
  return `<tr><th scope="row">${esc(label)}</th><td>${value}</td></tr>`;
}

function emptyNote(text: string): string {
  return `<p class="empty">${esc(text)}</p>`;
}

function renderProfile(member: Record<string, unknown> | null | undefined): string {
  if (!member) return emptyNote('No profile record found.');
  const fullName = [member['honorific'], member['firstName'], member['middleName'], member['lastName']]
    .filter(Boolean)
    .join(' ');

  return `
    <table>
      <tbody>
        ${row('Full name', esc(fullName || '—'))}
        ${row('Email', esc(member['email']))}
        ${row('Phone', esc(member['phone']))}
        ${row('Date of birth', longDate(member['dateOfBirth']))}
        ${row('Gender', esc(member['gender']))}
        ${row('Address', esc(member['address']))}
        ${row('City', esc(member['city']))}
        ${row('Postal code', esc(member['postalCode']))}
        ${row('Home branch', esc(member['homeBranchName']))}
        ${row('Secondary branch', esc(member['secondaryBranchName']))}
        ${row('At secondary branch?', yesNo(member['isAtSecondaryBranch']))}
        ${row('Membership date', longDate(member['membershipDate']))}
        ${row('Emergency contact — name', esc(member['emergencyContactName']))}
        ${row('Emergency contact — phone', esc(member['emergencyContactPhone']))}
        ${row('Emergency contact — relationship', esc(member['emergencyContactRelationship']))}
        ${row('Account active?', yesNo(member['isActive']))}
        ${row('Email verified?', yesNo(member['emailVerified']))}
        ${row('Approval status', esc(member['approvalStatus']))}
        ${row('Account created', longDateTime(member['createdAt']))}
        ${row('Account last updated', longDateTime(member['updatedAt']))}
      </tbody>
    </table>
  `;
}

const CONSENT_TYPE_LABELS: Record<string, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Notice',
  marketing: 'Marketing communications',
};

function renderConsents(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('No consent history recorded.');
  const body = rows
    .slice()
    .sort((a, b) => String(b['grantedAt'] ?? '').localeCompare(String(a['grantedAt'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['consentType'] === 'string' ? r['consentType'] : '';
        const label = CONSENT_TYPE_LABELS[raw] ?? labelFor(raw || 'consent');
        return `
      <tr>
        <td>${esc(label)}</td>
        <td>${esc(r['version'])}</td>
        <td>${yesNo(r['granted'])}</td>
        <td>${longDateTime(r['grantedAt'])}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>What you consented to</th><th>Version</th><th>Given?</th><th>When</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function withBranch(name: unknown, branchName: unknown): string {
  const n = typeof name === 'string' && name ? esc(name) : '—';
  const b = typeof branchName === 'string' && branchName ? esc(branchName) : '';
  return b ? `${n} <span class="muted-inline">(${b})</span>` : n;
}

function renderFellowshipMemberships(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('You are not recorded in any fellowships.');
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${withBranch(r['fellowshipName'], r['branchName'])}</td>
        <td>${esc(r['fellowshipType'])}</td>
        <td>${longDate(r['joinDate'])}</td>
        <td>${longDate(r['leaveDate'])}</td>
        <td>${yesNo(r['isActive'])}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Fellowship</th><th>Type</th><th>Joined</th><th>Left</th><th>Currently active?</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderDepartmentMemberships(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('You are not recorded in any departments.');
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${withBranch(r['departmentName'], r['branchName'])}</td>
        <td>${longDate(r['joinDate'])}</td>
        <td>${longDate(r['leaveDate'])}</td>
        <td>${yesNo(r['isActive'])}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Department</th><th>Joined</th><th>Left</th><th>Currently active?</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderServiceAttendance(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('No Sunday service attendance recorded.');
  const body = rows
    .slice()
    .sort((a, b) => String(b['serviceDate'] ?? b['recordedAt'] ?? '').localeCompare(String(a['serviceDate'] ?? a['recordedAt'] ?? '')))
    .map(
      (r) => {
        const label =
          typeof r['serviceTitle'] === 'string' && r['serviceTitle']
            ? String(r['serviceTitle'])
            : typeof r['serviceType'] === 'string'
              ? `${r['serviceType']} service`
              : 'Service';
        return `
      <tr>
        <td>${longDateTime(r['serviceDate'])}</td>
        <td>${withBranch(label, r['branchName'])}</td>
        <td>${esc(r['attendanceStatus'])}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Date</th><th>Service</th><th>Status</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderFellowshipMeetingAttendance(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('No fellowship meeting attendance recorded.');
  const body = rows
    .slice()
    .sort((a, b) => String(b['meetingDate'] ?? b['recordedAt'] ?? '').localeCompare(String(a['meetingDate'] ?? a['recordedAt'] ?? '')))
    .map(
      (r) => {
        const label =
          typeof r['meetingTitle'] === 'string' && r['meetingTitle']
            ? String(r['meetingTitle'])
            : typeof r['meetingTopic'] === 'string' && r['meetingTopic']
              ? String(r['meetingTopic'])
              : 'Fellowship meeting';
        return `
      <tr>
        <td>${longDateTime(r['meetingDate'])}</td>
        <td>${withBranch(label, r['fellowshipName'])}</td>
        <td>${esc(r['attendanceStatus'])}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Date</th><th>Meeting</th><th>Status</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderNewBelieverEnrollments(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('You are not enrolled in the New Believers pipeline.');
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r['stage'])}</td>
        <td>${esc(r['branchName'])}</td>
        <td>${longDate(r['enrolledAt'])}</td>
        <td>${longDate(r['completedAt'])}</td>
        <td>${yesNo(r['isActive'])}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Stage</th><th>Branch</th><th>Started</th><th>Completed</th><th>Currently active?</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  altar_call: 'Altar call',
  baptism: 'Baptism request',
  testimony: 'Testimony',
  baby_naming: 'Baby naming',
  baby_dedication: 'Baby dedication',
  first_time_visitor: 'First-time visitor',
};

function renderFormSubmissions(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('No form submissions on record about you.');
  const body = rows
    .slice()
    .sort((a, b) => String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['formType'] === 'string' ? r['formType'] : '';
        const label = FORM_TYPE_LABELS[raw] ?? labelFor(raw || 'form');
        return `
      <tr>
        <td>${esc(label)}</td>
        <td>${esc(r['status'])}</td>
        <td>${longDateTime(r['createdAt'])}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Form</th><th>Status</th><th>Submitted</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

const CADENCE_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  digest_daily: 'Daily digest',
};

function renderNotificationPreferences(rows: Array<Record<string, unknown>> = []): string {
  if (rows.length === 0) return emptyNote('No notification preferences saved (you receive the defaults).');
  const body = rows
    .slice()
    .sort((a, b) => String(a['category'] ?? '').localeCompare(String(b['category'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['category'] === 'string' ? r['category'] : '';
        const label = NOTIFICATION_CATEGORY_LABEL[raw as NotificationCategory] ?? labelFor(raw || 'category');
        const cadenceRaw = typeof r['cadence'] === 'string' ? r['cadence'] : '';
        const cadence = CADENCE_LABELS[cadenceRaw] ?? esc(cadenceRaw);
        return `
      <tr>
        <td>${esc(label)}</td>
        <td>${yesNo(r['enabled'])}</td>
        <td>${cadence}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>Category</th><th>Enabled?</th><th>How often</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function buildDataExportHtml(payload: ExportPayload): string {
  const member = payload.member ?? {};
  const displayName =
    [member['firstName'], member['lastName']].filter(Boolean).join(' ') || 'You';
  const exportedAt = new Date(payload.exportedAt);
  const exportedAtDisplay = Number.isNaN(exportedAt.getTime())
    ? payload.exportedAt
    : new Intl.DateTimeFormat(UK_DATE_LOCALE, LONG_DATE_TIME).format(exportedAt);

  const title = `Your Kharis data — ${displayName}`;

  const body = `
    <header class="cover">
      <div class="brand">Kharis Church</div>
      <h1>${esc(title)}</h1>
      <p class="cover-meta">Exported on ${esc(exportedAtDisplay)}</p>
      <p class="cover-note">
        This document lists the information Kharis Church holds about you.
        You can print or save it as a PDF from your browser (File → Print, then
        choose <em>Save as PDF</em>). If anything looks wrong, please contact
        <a href="mailto:privacy@kharis.org">privacy@kharis.org</a>.
      </p>
    </header>

    <section>
      <h2>Your profile</h2>
      ${renderProfile(payload.member)}
    </section>

    <section>
      <h2>Consents you've given</h2>
      ${renderConsents(payload.consents)}
    </section>

    <section>
      <h2>Your fellowships</h2>
      ${renderFellowshipMemberships(payload.fellowshipMemberships)}
    </section>

    <section>
      <h2>Your departments</h2>
      ${renderDepartmentMemberships(payload.departmentMemberships)}
    </section>

    <section>
      <h2>Sunday service attendance</h2>
      ${renderServiceAttendance(payload.serviceAttendance)}
    </section>

    <section>
      <h2>Fellowship meeting attendance</h2>
      ${renderFellowshipMeetingAttendance(payload.fellowshipMeetingAttendance)}
    </section>

    <section>
      <h2>New Believers journey</h2>
      ${renderNewBelieverEnrollments(payload.newBelieverEnrollments)}
    </section>

    <section>
      <h2>Forms you've submitted</h2>
      ${renderFormSubmissions(payload.formSubmissionsAboutMe)}
    </section>

    <section>
      <h2>Notification settings</h2>
      ${renderNotificationPreferences(payload.notificationPreferences)}
    </section>

    <footer>
      <p>
        This export covers Kharis Church's records about you. Additional
        material held about you — such as safeguarding notes or leader
        follow-ups — is available on request to
        <a href="mailto:privacy@kharis.org">privacy@kharis.org</a>.
      </p>
      <p class="tiny">Kharis Church — data exported ${esc(exportedAtDisplay)}</p>
    </footer>
  `;

  const css = `
    :root {
      color-scheme: light;
      --primary: #5D3FD3;
      --primary-dark: #451ebb;
      --gold: #f8b537;
      --ink: #1f1a2e;
      --muted: #6b6580;
      --line: #e5e2ee;
      --bg: #fafafd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
    }
    main {
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    header.cover {
      background: linear-gradient(135deg, var(--primary-dark), var(--primary));
      color: white;
      padding: 40px 32px;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    header.cover .brand {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--gold);
      font-weight: 600;
      margin-bottom: 8px;
    }
    header.cover h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.25;
    }
    header.cover .cover-meta {
      margin: 0 0 16px;
      opacity: 0.9;
      font-size: 14px;
    }
    header.cover .cover-note {
      margin: 0;
      font-size: 14px;
      opacity: 0.95;
      max-width: 620px;
    }
    header.cover a {
      color: var(--gold);
      text-decoration: underline;
    }
    section {
      background: white;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    section h2 {
      margin: 0 0 16px;
      font-size: 18px;
      color: var(--primary);
      border-bottom: 2px solid var(--line);
      padding-bottom: 8px;
    }
    p.empty {
      margin: 0;
      color: var(--muted);
      font-style: italic;
    }
    p.note {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 13px;
    }
    .muted-inline {
      color: var(--muted);
      font-weight: 400;
      font-size: 0.92em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    table.nested {
      margin-bottom: 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
    }
    thead th {
      text-align: left;
      background: #f4f1fb;
      color: var(--primary-dark);
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--line);
    }
    tbody th {
      text-align: left;
      font-weight: 500;
      color: var(--muted);
      padding: 10px 12px;
      width: 42%;
      background: #fbfaff;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      word-break: break-word;
    }
    tbody tr:last-child th,
    tbody tr:last-child td { border-bottom: none; }
    footer {
      margin-top: 24px;
      padding: 16px 4px 0;
      color: var(--muted);
      font-size: 13px;
    }
    footer a { color: var(--primary); }
    footer .tiny {
      margin-top: 8px;
      font-size: 11px;
      color: var(--muted);
    }
    @media print {
      body { background: white; }
      main { padding: 0; }
      header.cover { border-radius: 0; }
      section { break-inside: avoid; box-shadow: none; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body>
<main>${body}</main>
</body>
</html>`;
}
