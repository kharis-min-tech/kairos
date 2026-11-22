import { BRAND_NAME } from './brand';

/**
 * The pilot interest form: what the pilot asks of a branch.
 *
 * The rollout plan is blunt about why this list exists and why it is shown
 * before the form rather than after it: "The time cost belongs in the
 * announcement rather than in a later conversation. A branch that volunteers
 * on enthusiasm alone and then meets the daily approval queue will sour by
 * the third week."
 *
 * So the commitments live here, next to the version stamped onto every
 * submission. The page renders this array and the notification quotes the
 * version, which means the record says what a branch was shown, and the
 * wording cannot drift between the page and the record the way duplicated
 * copy always does.
 *
 * They are read, not ticked. Five checkboxes would turn reading into a task
 * to be got through, and a stored tick would imply a promise nobody holds
 * anyone to. Changing the wording means bumping the version, nothing else.
 */
export const PILOT_REQUIREMENTS_VERSION = '2026-11.2';

export interface PilotRequirement {
  /** Stable id for the commitment. Not stored; the version is. */
  key:
    | 'engagement'
    | 'onboardingLiaison'
    | 'keyRoles'
    | 'training'
    | 'activeUsage';
  title: string;
  detail: string;
}

export const PILOT_REQUIREMENTS: readonly PilotRequirement[] = [
  {
    key: 'engagement',
    title: 'You stay engaged, and you talk to us',
    detail:
      'The pilot runs on a feedback loop, so communication is the thing it depends on most. We need to be able to reach you and your leaders, and to get an answer back, for the whole of the pilot.',
  },
  {
    key: 'onboardingLiaison',
    title: 'You appoint a dedicated onboarding liaison',
    detail:
      'One named person whose job is to confirm your full list of departments and fellowships as they actually stand today, not as an old list says they stand. Everything else is built on that list being right.',
  },
  {
    key: 'keyRoles',
    title: 'You confirm your key roles up front',
    detail:
      'A head of admin, a safeguarding lead for your branch, and every department leader and fellowship leader. These people are onboarded first, before anyone else at your branch.',
  },
  {
    key: 'training',
    title: 'Two to three hours of training a week, for two to three weeks',
    detail:
      `A rough commitment from you, your liaison and the leaders named above. The training covers every role and every feature of ${BRAND_NAME}. Your onboarding liaison or head of admin must be in every session, because they become the point of contact for any initial problems your branch hits.`,
  },
  {
    key: 'activeUsage',
    title: 'You actually use it, and you tell us how it goes',
    detail:
      'Daily use through the pilot, and feedback said plainly when something does not work. Your branch will hit problems before anyone else does, and we fix what you report before the next branch starts.',
  },
] as const;

/**
 * The branches a leader can put forward.
 *
 * A fixed list rather than a lookup against the branches table. The form is
 * public and runs before any branch has been seeded for the pilot, so there
 * is nothing authoritative to read from yet, and a free-text box invites
 * twenty spellings of the same branch. The submission carries the name
 * because there is no id to carry.
 *
 * Adding a branch here is the whole of adding a branch to the form.
 */
export const PILOT_BRANCHES: readonly string[] = [
  'London',
  'Accra',
  'Birmingham',
  'Brighton',
  'Bristol',
  'Chatham',
  'Chelmsford',
  'Coventry',
  'Croydon',
  'Freetown',
  'Luton',
  'Northampton',
  'Nottingham',
  'Orpington',
  'Reading',
  'Swindon',
  'Manchester',
  'KP2 Barking',
  'KP2 Birmingham',
  'KP2 London',
  'KP2 Peterborough',
  'KP2 Romford',
  'KP2 Southampton',
] as const;

export const PILOT_NAME_MAX = 200;
export const PILOT_EMAIL_MAX = 255;

// ── Wire shapes ───────────────────────────────────────────

export interface PilotRequirementsResponse {
  version: string;
  requirements: PilotRequirement[];
}

/**
 * A submission.
 *
 * Nothing is persisted: the API validates this and emails it. So this shape
 * is the whole record, and every field in it has to earn a line in that
 * email. There is no role field because the form is addressed to the branch
 * leader; no phone because we reply by email; and no free text because a
 * paragraph about why a branch should go first was never going to decide it.
 */
export interface SubmitPilotInterestRequest {
  firstName: string;
  lastName: string;
  email: string;
  branchName: string;
  approxMembers?: number;
}
