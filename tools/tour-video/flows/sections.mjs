/**
 * Every handbook section that gets a clip, and what the clip shows.
 *
 * One row per page under apps/docs. `account` is whoever actually sees that
 * screen: recording the member pages as an administrator would show a view no
 * member has, which is worse than no clip.
 *
 * Pages with nothing to film — the legal documents, the release notes, the
 * conceptual pages that describe the model rather than a screen — are listed
 * at the bottom with the reason, so the gap is a decision rather than an
 * oversight.
 */
import { ACCOUNTS } from './index.mjs';
import { sectionFlow } from './section.mjs';

const admin = ACCOUNTS.admin;
const pastor = ACCOUNTS.pastor;
const member = ACCOUNTS.member;

/** @type {Array<Parameters<typeof sectionFlow>[0]>} */
export const SECTIONS = [
  // ── Platform ────────────────────────────────────────────────
  { slug: 'platform/dashboard', path: '/dashboard', account: admin, stops: [
    { title: 'Church Pulse' },
    { title: 'Needs You', scroll: 320 },
    { title: 'Recent activity', scroll: 520 },
  ]},
  { slug: 'platform/members', path: '/members', account: admin, stops: [
    { title: 'The directory' },
    { title: 'Finding somebody', point: 'input[type="search"], input[placeholder*="earch"]' },
    { title: 'Opening a profile', scroll: 300 },
  ]},
  { slug: 'platform/branches', path: '/admin/branches', account: admin, stops: [
    { title: 'Every branch' },
    { title: 'Inside one', scroll: 300 },
  ]},
  { slug: 'platform/regions', path: '/admin/regions', account: admin, stops: [
    { title: 'Regions' },
    { title: 'Branches attached', scroll: 260 },
  ]},
  { slug: 'platform/fellowships', path: '/fellowships', account: admin, stops: [
    { title: 'The fellowships' },
    { title: 'Filtering by type' },
    { title: 'Finding one on the map' },
  ]},
  { slug: 'platform/departments', path: '/departments', account: pastor, stops: [
    { title: 'Ministry teams' },
    { title: 'Inside a department', scroll: 300 },
  ]},
  { slug: 'platform/attendance', path: '/attendance', account: admin, stops: [
    { title: 'Services' },
    { title: 'Recording who came', scroll: 300 },
  ]},
  { slug: 'platform/membership', path: '/membership', account: admin, stops: [
    { title: 'The class' },
    { title: 'Cohorts', scroll: 320 },
  ]},
  { slug: 'platform/new-believers', path: '/new-believers', account: admin, stops: [
    { title: 'The pipeline' },
    { title: 'Sessions', scroll: 260 },
  ]},
  { slug: 'platform/follow-ups', path: '/follow-ups', account: pastor, stops: [
    { title: 'The queues' },
    { title: 'Logging one', scroll: 280 },
  ]},
  { slug: 'platform/concerns', path: '/concerns', account: pastor, stops: [
    { title: 'Welfare and safeguarding' },
    { title: 'Reading one', scroll: 280 },
  ]},
  { slug: 'platform/outreach', path: '/outreach/programs', account: admin, stops: [
    { title: 'Programmes' },
    { title: 'Capturing a soul', scroll: 280 },
  ]},
  { slug: 'platform/forms', path: '/forms', account: admin, stops: [
    { title: 'The forms' },
    { title: 'Filling one in', scroll: 300 },
  ]},
  { slug: 'platform/souls-pipeline', path: '/souls', account: admin, stops: [
    { title: 'The board' },
    { title: 'Moving somebody along', scroll: 260 },
  ]},
  { slug: 'platform/souls-dashboard', path: '/souls-dashboard', account: admin, stops: [
    { title: 'The numbers' },
    { title: 'By status', scroll: 420 },
  ]},
  { slug: 'platform/profile', path: '/profile', account: member, stops: [
    { title: 'Your details' },
    { title: 'Your settings', scroll: 320 },
  ]},

  // ── Church management ───────────────────────────────────────
  { slug: 'church-management/member-lifecycle', path: '/members', account: admin, stops: [
    { title: 'From visitor to member' },
    { title: 'Where status shows', scroll: 300 },
  ]},
  { slug: 'church-management/attendance-tracking', path: '/attendance', account: admin, stops: [
    { title: 'Taking a register' },
    { title: 'Self check-in', at: '/attendance/check-in' },
  ]},
  { slug: 'church-management/fellowship-management', path: '/fellowships', account: pastor, stops: [
    { title: 'Running a fellowship' },
    { title: 'Its meetings', scroll: 300 },
  ]},
  { slug: 'church-management/branch-management', path: '/admin/branches', account: admin, stops: [
    { title: 'Branch settings' },
    { title: 'Who leads it', scroll: 300 },
  ]},
  { slug: 'church-management/reporting', path: '/reports', account: admin, stops: [
    { title: 'What is reported' },
    { title: 'Changing the window', scroll: 300 },
  ]},
  { slug: 'church-management/department-administration', path: '/departments', account: pastor, stops: [
    { title: 'Rosters and rotas' },
    { title: 'Recruitment', scroll: 320 },
  ]},

  // ── Administration ──────────────────────────────────────────
  { slug: 'administration/permissions', path: '/admin/branches', account: admin, stops: [
    { title: 'Grants, not job titles' },
    { title: 'Assigning one', scroll: 300 },
  ]},
  { slug: 'administration/capabilities', path: '/admin/branches', account: admin, stops: [
    { title: 'What a capability is' },
    { title: 'Where they bite', scroll: 280 },
  ]},
  { slug: 'administration/approvals', path: '/members/approval', account: admin, stops: [
    { title: 'The queue' },
    { title: 'Approving somebody' },
  ]},
  { slug: 'administration/settings', path: '/profile/settings/notifications', account: admin, stops: [
    { title: 'Your settings' },
    { title: 'Notifications', scroll: 280 },
  ]},

  // ── Analytics ───────────────────────────────────────────────
  { slug: 'analytics/church-health', path: '/reports', account: admin, stops: [
    { title: 'Is the church healthy' },
    { title: 'Reading the trend', scroll: 360 },
  ]},
  { slug: 'analytics/engagement', path: '/reports', account: admin, stops: [
    { title: 'Who is engaged' },
    { title: 'The engagement view', scroll: 420 },
  ]},
  { slug: 'analytics/growth-reports', path: '/reports', account: admin, stops: [
    { title: 'Growth' },
    { title: 'New members', scroll: 320 },
  ]},
  { slug: 'analytics/attendance-reports', path: '/attendance/reports', account: admin, stops: [
    { title: 'Attendance reports' },
    { title: 'Who is missing', scroll: 400 },
  ]},

  // ── Getting started ─────────────────────────────────────────
  { slug: 'getting-started/your-first-church', path: '/admin/branches', account: admin, stops: [
    { title: 'Setting up' },
    { title: 'Your first branch', scroll: 260 },
  ]},
  { slug: 'getting-started/roles-permissions', path: '/admin/branches', account: admin, stops: [
    { title: 'Who can do what' },
    { title: 'Seeing it on an account', scroll: 300 },
  ]},
];

/**
 * Pages with no clip, and why. A handbook page that describes the model
 * rather than a screen has nothing to film, and a legal document should be
 * read rather than watched.
 */
export const NO_CLIP = {
  'index': 'the handbook home page',
  'faq': 'answers point at other pages, each of which has its own clip',
  'release-notes': 'a changelog; nothing to demonstrate',
  'legal/privacy': 'a binding document — it should be read, not watched',
  'legal/terms': 'a binding document — it should be read, not watched',
  'getting-started/introduction': 'covered by the general tour',
  'getting-started/what-is-kairos': 'covered by the general tour',
  'getting-started/core-concepts': 'describes the model, not a screen',
  'getting-started/video-tour': 'this is the page the videos live on',
  'platform/reports': 'same screen as analytics/church-health',
};

export const SECTION_FLOWS = Object.fromEntries(
  SECTIONS.map((spec) => [spec.slug.replace(/\//g, '-'), sectionFlow(spec)]),
);
