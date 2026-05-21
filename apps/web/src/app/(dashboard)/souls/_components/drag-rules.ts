export const SOUL_PIPELINE_LANES = [
  'New',
  'Following Up',
  'Converted',
] as const;

export const SOUL_DISPOSITION_STATUSES = [
  'Interested',
  'Not Interested',
  'Lost Contact',
] as const;

export const SOUL_STATUSES = [
  ...SOUL_PIPELINE_LANES,
  ...SOUL_DISPOSITION_STATUSES,
] as const;

export type SoulPipelineLane = (typeof SOUL_PIPELINE_LANES)[number];
export type SoulDispositionStatus = (typeof SOUL_DISPOSITION_STATUSES)[number];
export type SoulStatus = (typeof SOUL_STATUSES)[number];

export interface SoulDropRule {
  allowed: boolean;
  reason?: string;
}

export function isSoulPipelineLane(value: string): value is SoulPipelineLane {
  return (SOUL_PIPELINE_LANES as readonly string[]).includes(value);
}

export function isSoulDispositionStatus(value: string): value is SoulDispositionStatus {
  return (SOUL_DISPOSITION_STATUSES as readonly string[]).includes(value);
}

export function getSoulLane(status: string): SoulPipelineLane {
  if (status === 'New' || status === 'Converted') {
    return status;
  }
  return 'Following Up';
}

export function getSoulDisposition(status: string): SoulDispositionStatus | null {
  return isSoulDispositionStatus(status) ? status : null;
}

export function getSoulDropRule(
  fromStatus: string | undefined,
  toLane: string,
): SoulDropRule {
  if (!fromStatus || !isSoulPipelineLane(toLane)) {
    return { allowed: false };
  }
  if (getSoulLane(fromStatus) === toLane) {
    return { allowed: false };
  }
  if (fromStatus === 'Converted') {
    return {
      allowed: false,
      reason: 'Converted souls are already linked to a member. Update the record from the soul details page if this was converted in error.',
    };
  }
  if (toLane === 'Converted') {
    return {
      allowed: false,
      reason: 'Use the conversion flow from the soul details page so the member record is created.',
    };
  }
  return { allowed: true };
}
