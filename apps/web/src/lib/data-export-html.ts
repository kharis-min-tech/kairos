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

/**
 * The slice of i18next's `t` this file needs. Threaded through every render
 * function rather than read from the i18n singleton, so the builder stays a
 * pure function of its inputs and can be tested without booting i18next.
 */
export type Translate = (key: string) => string;

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

function yesNo(value: unknown, t: Translate): string {
  if (value === true) return t('dataExport:yes');
  if (value === false) return t('dataExport:no');
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

function renderProfile(member: Record<string, unknown> | null | undefined, t: Translate): string {
  if (!member) return emptyNote(t('dataExport:noProfileRecord'));
  const fullName = [member['honorific'], member['firstName'], member['middleName'], member['lastName']]
    .filter(Boolean)
    .join(' ');

  return `
    <table>
      <tbody>
        ${row(t('dataExport:profileFullName'), esc(fullName || '—'))}
        ${row(t('dataExport:profileEmail'), esc(member['email']))}
        ${row(t('dataExport:profilePhone'), esc(member['phone']))}
        ${row(t('dataExport:profileDateOfBirth'), longDate(member['dateOfBirth']))}
        ${row(t('dataExport:profileGender'), esc(member['gender']))}
        ${row(t('dataExport:profileAddress'), esc(member['address']))}
        ${row(t('dataExport:profileCity'), esc(member['city']))}
        ${row(t('dataExport:profilePostalCode'), esc(member['postalCode']))}
        ${row(t('dataExport:profileHomeBranch'), esc(member['homeBranchName']))}
        ${row(t('dataExport:profileSecondaryBranch'), esc(member['secondaryBranchName']))}
        ${row(t('dataExport:profileAtSecondaryBranch'), yesNo(member['isAtSecondaryBranch'], t))}
        ${row(t('dataExport:profileMembershipDate'), longDate(member['membershipDate']))}
        ${row(t('dataExport:profileEmergencyName'), esc(member['emergencyContactName']))}
        ${row(t('dataExport:profileEmergencyPhone'), esc(member['emergencyContactPhone']))}
        ${row(t('dataExport:profileEmergencyRelationship'), esc(member['emergencyContactRelationship']))}
        ${row(t('dataExport:profileAccountActive'), yesNo(member['isActive'], t))}
        ${row(t('dataExport:profileEmailVerified'), yesNo(member['emailVerified'], t))}
        ${row(t('dataExport:profileApprovalStatus'), esc(member['approvalStatus']))}
        ${row(t('dataExport:profileAccountCreated'), longDateTime(member['createdAt']))}
        ${row(t('dataExport:profileAccountUpdated'), longDateTime(member['updatedAt']))}
      </tbody>
    </table>
  `;
}

const consentTypeLabels = (t: Translate): Record<string, string> => ({
  terms: t('dataExport:consentTerms'),
  privacy: t('dataExport:consentPrivacy'),
  marketing: t('dataExport:consentMarketing'),
});

function renderConsents(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:noConsentHistory'));
  const body = rows
    .slice()
    .sort((a, b) => String(b['grantedAt'] ?? '').localeCompare(String(a['grantedAt'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['consentType'] === 'string' ? r['consentType'] : '';
        const label = consentTypeLabels(t)[raw] ?? labelFor(raw || 'consent');
        return `
      <tr>
        <td>${esc(label)}</td>
        <td>${esc(r['version'])}</td>
        <td>${yesNo(r['granted'], t)}</td>
        <td>${longDateTime(r['grantedAt'])}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>${t('dataExport:thConsentedTo')}</th><th>${t('dataExport:thVersion')}</th><th>${t('dataExport:thGiven')}</th><th>${t('dataExport:thWhen')}</th></tr>
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

function renderFellowshipMemberships(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:notInAnyFellowships'));
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${withBranch(r['fellowshipName'], r['branchName'])}</td>
        <td>${esc(r['fellowshipType'])}</td>
        <td>${longDate(r['joinDate'])}</td>
        <td>${longDate(r['leaveDate'])}</td>
        <td>${yesNo(r['isActive'], t)}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>${t('dataExport:thFellowship')}</th><th>${t('dataExport:thType')}</th><th>${t('dataExport:thJoined')}</th><th>${t('dataExport:thLeft')}</th><th>${t('dataExport:thCurrentlyActive')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderDepartmentMemberships(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:notInAnyDepartments'));
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${withBranch(r['departmentName'], r['branchName'])}</td>
        <td>${longDate(r['joinDate'])}</td>
        <td>${longDate(r['leaveDate'])}</td>
        <td>${yesNo(r['isActive'], t)}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>${t('dataExport:thDepartment')}</th><th>${t('dataExport:thJoined')}</th><th>${t('dataExport:thLeft')}</th><th>${t('dataExport:thCurrentlyActive')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderServiceAttendance(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:noServiceAttendance'));
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
              : t('dataExport:serviceFallback');
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
        <tr><th>${t('dataExport:thDate')}</th><th>${t('dataExport:thService')}</th><th>${t('dataExport:thStatus')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderFellowshipMeetingAttendance(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:noMeetingAttendance'));
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
              : t('dataExport:meetingFallback');
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
        <tr><th>${t('dataExport:thDate')}</th><th>${t('dataExport:thMeeting')}</th><th>${t('dataExport:thStatus')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderNewBelieverEnrollments(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:notEnrolledNewBelievers'));
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r['stage'])}</td>
        <td>${esc(r['branchName'])}</td>
        <td>${longDate(r['enrolledAt'])}</td>
        <td>${longDate(r['completedAt'])}</td>
        <td>${yesNo(r['isActive'], t)}</td>
      </tr>
    `,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>${t('dataExport:thStage')}</th><th>${t('dataExport:thBranch')}</th><th>${t('dataExport:thStarted')}</th><th>${t('dataExport:thCompleted')}</th><th>${t('dataExport:thCurrentlyActive')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

const formTypeLabels = (t: Translate): Record<string, string> => ({
  altar_call: t('dataExport:formAltarCall'),
  baptism: t('dataExport:formBaptism'),
  testimony: t('dataExport:formTestimony'),
  baby_naming: t('dataExport:formBabyNaming'),
  baby_dedication: t('dataExport:formBabyDedication'),
  first_time_visitor: t('dataExport:formFirstTimeVisitor'),
});

function renderFormSubmissions(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:noFormSubmissions'));
  const body = rows
    .slice()
    .sort((a, b) => String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['formType'] === 'string' ? r['formType'] : '';
        const label = formTypeLabels(t)[raw] ?? labelFor(raw || 'form');
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
        <tr><th>${t('dataExport:thForm')}</th><th>${t('dataExport:thStatus')}</th><th>${t('dataExport:thSubmitted')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

const cadenceLabels = (t: Translate): Record<string, string> => ({
  immediate: t('dataExport:cadenceImmediate'),
  digest_daily: t('dataExport:cadenceDailyDigest'),
});

function renderNotificationPreferences(rows: Array<Record<string, unknown>> = [], t: Translate): string {
  if (rows.length === 0) return emptyNote(t('dataExport:noNotificationPreferences'));
  const body = rows
    .slice()
    .sort((a, b) => String(a['category'] ?? '').localeCompare(String(b['category'] ?? '')))
    .map(
      (r) => {
        const raw = typeof r['category'] === 'string' ? r['category'] : '';
        const translated = raw ? t(`dataExport:category_${raw}`) : '';
        const label =
          translated && translated !== `dataExport:category_${raw}`
            ? translated
            : NOTIFICATION_CATEGORY_LABEL[raw as NotificationCategory] ?? labelFor(raw || 'category');
        const cadenceRaw = typeof r['cadence'] === 'string' ? r['cadence'] : '';
        const cadence = cadenceLabels(t)[cadenceRaw] ?? esc(cadenceRaw);
        return `
      <tr>
        <td>${esc(label)}</td>
        <td>${yesNo(r['enabled'], t)}</td>
        <td>${cadence}</td>
      </tr>
    `;
      },
    )
    .join('');
  return `
    <table>
      <thead>
        <tr><th>${t('dataExport:thCategory')}</th><th>${t('dataExport:thEnabled')}</th><th>${t('dataExport:thHowOften')}</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function buildDataExportHtml(payload: ExportPayload, t: Translate, lang = 'en'): string {
  const member = payload.member ?? {};
  const displayName =
    [member['firstName'], member['lastName']].filter(Boolean).join(' ') || t('dataExport:you');
  const exportedAt = new Date(payload.exportedAt);
  const exportedAtDisplay = Number.isNaN(exportedAt.getTime())
    ? payload.exportedAt
    : new Intl.DateTimeFormat(UK_DATE_LOCALE, LONG_DATE_TIME).format(exportedAt);

  const title = `${t('dataExport:title')}, ${displayName}`;

  const body = `
    <header class="cover">
      <div class="brand">Kharis Church</div>
      <h1>${esc(title)}</h1>
      <p class="cover-meta">${t('dataExport:exportedOn')} ${esc(exportedAtDisplay)}</p>
      <!-- i18n-ignore: a literal email address. -->
      <p class="cover-note">
        ${t('dataExport:coverNote')}
        <a href="mailto:privacy@kharis.org">privacy@kharis.org</a>.
      </p>
    </header>

    <section>
      <h2>${t('dataExport:sectionProfile')}</h2>
      ${renderProfile(payload.member, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionConsents')}</h2>
      ${renderConsents(payload.consents, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionFellowships')}</h2>
      ${renderFellowshipMemberships(payload.fellowshipMemberships, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionDepartments')}</h2>
      ${renderDepartmentMemberships(payload.departmentMemberships, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionServiceAttendance')}</h2>
      ${renderServiceAttendance(payload.serviceAttendance, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionMeetingAttendance')}</h2>
      ${renderFellowshipMeetingAttendance(payload.fellowshipMeetingAttendance, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionNewBelievers')}</h2>
      ${renderNewBelieverEnrollments(payload.newBelieverEnrollments, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionForms')}</h2>
      ${renderFormSubmissions(payload.formSubmissionsAboutMe, t)}
    </section>

    <section>
      <h2>${t('dataExport:sectionNotifications')}</h2>
      ${renderNotificationPreferences(payload.notificationPreferences, t)}
    </section>

    <footer>
      <!-- i18n-ignore: a literal email address. -->
      <p>
        ${t('dataExport:footerNote')}
        <a href="mailto:privacy@kharis.org">privacy@kharis.org</a>.
      </p>
      <p class="tiny">${t('dataExport:footerExportedLine')} ${esc(exportedAtDisplay)}</p>
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
<html lang="${esc(lang)}">
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
