export const RECRUITMENT_PIPELINE_STATUSES = [
  'applied',
  'interview_scheduled',
  'interviewed',
  'offered',
  'probation',
] as const;

export type RecruitmentPipelineStatus = (typeof RECRUITMENT_PIPELINE_STATUSES)[number];

export type RecruitmentDragAction = 'schedule' | 'record' | 'offer';

export interface RecruitmentDragRequest {
  status: string;
  interviewOutcome?: string | null;
}

export interface RecruitmentDropRule {
  allowed: boolean;
  action?: RecruitmentDragAction;
  reason?: string;
}

export function isRecruitmentPipelineStatus(
  value: string,
): value is RecruitmentPipelineStatus {
  return (RECRUITMENT_PIPELINE_STATUSES as readonly string[]).includes(value);
}

export function canDragRecruitmentRequest(request: RecruitmentDragRequest): boolean {
  if (request.status === 'applied' || request.status === 'interview_scheduled') return true;
  return request.status === 'interviewed' && request.interviewOutcome === 'pass';
}

export function getRecruitmentDropRule(
  request: RecruitmentDragRequest | undefined,
  targetStatus: string,
): RecruitmentDropRule {
  if (!request || !isRecruitmentPipelineStatus(targetStatus)) {
    return { allowed: false };
  }
  if (request.status === targetStatus) {
    return { allowed: false };
  }
  if (request.status === 'applied' && targetStatus === 'interview_scheduled') {
    return { allowed: true, action: 'schedule' };
  }
  if (request.status === 'interview_scheduled' && targetStatus === 'interviewed') {
    return { allowed: true, action: 'record' };
  }
  if (request.status === 'interviewed' && targetStatus === 'offered') {
    if (request.interviewOutcome !== 'pass') {
      return {
        allowed: false,
        reason: 'Only candidates with a passed interview can receive an offer.',
      };
    }
    return { allowed: true, action: 'offer' };
  }
  if (request.status === 'offered' && targetStatus === 'probation') {
    return {
      allowed: false,
      reason: 'The applicant must accept the offer before probation starts.',
    };
  }
  return {
    allowed: false,
    reason: 'Recruitment cards can only move to the next required workflow stage.',
  };
}
