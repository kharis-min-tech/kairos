import { BRAND_NAME } from './brand';

/**
 * The pilot interest form: what a branch is agreeing to by volunteering.
 *
 * The rollout plan is blunt about why this list exists and why it is shown
 * before the form rather than after it: "The time cost belongs in the
 * announcement rather than in a later conversation. A branch that volunteers
 * on enthusiasm alone and then meets the daily approval queue will sour by
 * the third week."
 *
 * So the commitments live here, next to the version stamped onto every row.
 * The page renders this array and the API stores which version was rendered,
 * which means nobody can later rewrite what a branch agreed to, and the
 * wording cannot drift between the page and the record the way duplicated
 * copy always does.
 *
 * `key` is also the column name on `pilot_interest`, minus the `ack_` prefix.
 * Adding a commitment means a column, a version bump, and nothing else.
 */
export const PILOT_REQUIREMENTS_VERSION = '2026-11';

export interface PilotRequirement {
  /** Matches the `ack_<key>` column on pilot_interest. */
  key:
    | 'dailyApprovals'
    | 'attendanceEveryService'
    | 'noHistoryImport'
    | 'pilotFeedback'
    | 'training'
    | 'retireOldSystem';
  title: string;
  detail: string;
}

export const PILOT_REQUIREMENTS: readonly PilotRequirement[] = [
  {
    key: 'dailyApprovals',
    title: 'Someone approves new members every day',
    detail:
      'When a member signs up, they cannot use the app until someone at your branch approves them. That needs doing every day, including Mondays, because most people sign up straight after a Sunday service. If nobody checks until Wednesday, those members have been locked out for three days.',
  },
  {
    key: 'attendanceEveryService',
    title: 'Attendance is taken at every service',
    detail:
      'Take attendance at every service, not just most of them. Your reports are worked out from these numbers, so if a few services are missed, that month will show the wrong totals.',
  },
  {
    key: 'noHistoryImport',
    title: 'You start with no data, not with your old records',
    detail:
      `Nothing moves across from your old system. Each member creates their own record in ${BRAND_NAME} when they sign up, so your reports will be empty at first and fill up as people join and attend. You will only see the full picture once most of your branch is using the app.`,
  },
  {
    key: 'pilotFeedback',
    title: 'You are first, so you will find the problems',
    detail:
      'Some things will not work properly, and your branch will hit them before anyone else does. We need a leader who will tell us exactly what went wrong, even when it is awkward to say. We fix what you report before the next branch starts.',
  },
  {
    key: 'training',
    title: 'Two rounds of training, over one to two weeks',
    detail:
      'Training happens twice. First we show you and your head of admin every part of the app, including what a member sees on their phone. Then your head of admin teaches each department leader, fellowship leader and role holder the part they will use. After that your branch has its own expert, so you are not waiting on us.',
  },
  {
    key: 'retireOldSystem',
    title: 'The old system gets switched off',
    detail:
      'You pick a date to stop using your old system, and tell everyone well before it arrives. If both stay open, some people keep using the old one, and then neither system has everybody on it.',
  },
] as const;

/**
 * What the plan looks for when choosing, as opposed to what it asks for.
 *
 * Shown on the page as "what we are looking for" rather than as checkboxes,
 * because these are facts about a branch, not promises. Notably absent: size.
 * The plan rules it out in both directions — a large branch with a reluctant
 * leader "teaches us nothing except that people do not log in", and a very
 * small one "may not have enough of a normal mix of fellowships and
 * departments to exercise everything".
 */
export const PILOT_SELECTION_NOTES: readonly string[] = [
  'A leader who wants to do it and will give direct feedback.',
  'Someone available to act as head of admin, set up before members start signing up.',
  'A safeguarding lead already in post.',
  'A normal mix of fellowships and departments, so the pilot covers what every other branch will use.',
  'We are not choosing on size, in either direction.',
] as const;

export const PILOT_ROLE_VALUES = ['branch_pastor', 'branch_leader', 'other'] as const;
export type PilotRole = (typeof PILOT_ROLE_VALUES)[number];

export const PILOT_ROLE_LABEL: Record<PilotRole, string> = {
  branch_pastor: 'Branch pastor',
  branch_leader: 'Branch leader',
  other: 'Another role at the branch',
};

export const PILOT_INTEREST_STATUS_VALUES = ['new', 'reviewing', 'selected', 'declined'] as const;
export type PilotInterestStatus = (typeof PILOT_INTEREST_STATUS_VALUES)[number];

export const PILOT_NAME_MAX = 200;
export const PILOT_EMAIL_MAX = 255;

// ── Wire shapes ───────────────────────────────────────────

export interface PilotRequirementsResponse {
  version: string;
  requirements: PilotRequirement[];
  selectionNotes: string[];
}

export interface SubmitPilotInterestRequest {
  fullName: string;
  roleAtBranch: PilotRole;
  roleOther?: string;
  email: string;
  phone?: string;
  branchId?: string;
  branchName: string;
  fellowshipCount?: number;
  departmentCount?: number;
  approxMembers?: number;
  headOfAdminName?: string;
  headOfAdminEmail?: string;
  safeguardingLeadInPost: boolean;
  safeguardingLeadName?: string;
  earliestStart?: string;
  acknowledgements: Record<PilotRequirement['key'], boolean>;
  whyThisBranch?: string;
  notes?: string;
}

/**
 * A row as the admin queue receives it.
 *
 * Spelled out rather than derived from the request type. What a browser sends
 * omits a field; what the database returns carries an explicit null, and
 * pretending those are the same shape makes every optional field lie.
 */
export interface PilotInterestRow {
  id: string;
  fullName: string;
  roleAtBranch: PilotRole;
  roleOther: string | null;
  email: string;
  phone: string | null;
  branchId: string | null;
  branchName: string;
  fellowshipCount: number | null;
  departmentCount: number | null;
  approxMembers: number | null;
  headOfAdminName: string | null;
  headOfAdminEmail: string | null;
  safeguardingLeadInPost: boolean;
  safeguardingLeadName: string | null;
  earliestStart: string | null;
  requirementsVersion: string;
  whyThisBranch: string | null;
  notes: string | null;
  status: PilotInterestStatus;
  reviewNotes: string | null;
  submittedAt: string;
}

export interface PilotInterestListResponse {
  rows: PilotInterestRow[];
  total: number;
}
