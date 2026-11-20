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
      'Members cannot sign in until they are approved. Somebody at your branch has to clear that queue the same day, including the Monday after a Sunday push. A member who signs up after a service and is still waiting on Wednesday has spent three days locked out of an app they were just told to install.',
  },
  {
    key: 'attendanceEveryService',
    title: 'Attendance is recorded at every service',
    detail:
      'Not most weeks. Attendance is the figure every report is built from, and a month with gaps in it cannot be read.',
  },
  {
    key: 'noHistoryImport',
    title: 'Your numbers start from day one, not from your history',
    detail:
      `Nothing is carried over from the old system. Every member record in ${BRAND_NAME} is created by that member signing themselves up, so your reports are empty at first and fill as the branch uses it. The benefit only shows once the branch has genuinely adopted it.`,
  },
  {
    key: 'pilotFeedback',
    title: 'This is a pilot, and you tell us when it is wrong',
    detail:
      'Things will be broken. We need a leader who will say so plainly, including when it is unflattering. What your branch reports gets fixed before any other branch sees it — that is the whole point of going first.',
  },
  {
    key: 'training',
    title: 'Two rounds of training, over one to two weeks',
    detail:
      'First the branch leader and head of admin go through every section, including what a member sees. Then the head of admin sits with each department lead, fellowship leader and role holder as they learn their own section, so your branch ends up with its own expert rather than depending on us.',
  },
  {
    key: 'retireOldSystem',
    title: 'The old system gets switched off',
    detail:
      'There will be a date, set in advance. Running two systems is how this fails: anyone who can still use the old one will, and then neither holds the full picture.',
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
