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
    title: 'Someone clears the sign-up queue every day',
    detail:
      'New members cannot sign in until someone at your branch approves them. That queue needs clearing the same day, including the Monday after a Sunday service, when most sign-ups arrive. A member who signs up on Sunday and is still waiting on Wednesday has spent three days locked out of an app they were asked to install.',
  },
  {
    key: 'attendanceEveryService',
    title: 'Attendance is recorded at every service',
    detail:
      'Attendance needs recording at every service, not most of them. It is the figure every report is built from, and a month with services missing cannot be relied on.',
  },
  {
    key: 'noHistoryImport',
    title: 'Your numbers start from day one, not from your history',
    detail:
      `No records are carried over from the old system. Every member record in ${BRAND_NAME} is created when that member signs up, so your reports start empty and build as the branch uses the app. The full benefit appears once the branch has properly adopted it.`,
  },
  {
    key: 'pilotFeedback',
    title: 'This is a pilot, and you tell us when it is wrong',
    detail:
      'Some things will not work as intended. We need a leader who will tell us plainly, including when the feedback is unflattering. Whatever your branch reports is fixed before any other branch sees it, which is the main reason for going first.',
  },
  {
    key: 'training',
    title: 'Two rounds of training, over one to two weeks',
    detail:
      'First the branch leader and head of admin go through every section of the app, including what a member sees. The head of admin then works through each section with the department leaders, fellowship leaders and other role holders. Your branch ends up with its own expert rather than depending on us.',
  },
  {
    key: 'retireOldSystem',
    title: 'The old system gets switched off',
    detail:
      'A switch-off date is agreed in advance. Running two systems side by side is the most common way this fails: anyone who can still use the old one will, and neither system ends up holding the full picture.',
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
  'A normal mix of fellowships and departments, so the pilot exercises what every other branch will use.',
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
