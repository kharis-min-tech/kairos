import type { NewBelieverSession } from '@kairos/types';
import {
  STAGES,
  SESSION_STAGE_VALUES,
  stageLabel,
  stageTopic,
} from '../../_components/stage-config';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

export function todayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isUpcomingSession(sessionDate: string | Date): boolean {
  return new Date(sessionDate) >= startOfToday();
}

export function formatSessionDate(sessionDate: string | Date): string {
  return new Date(sessionDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatShortSessionDate(sessionDate: string | Date): string {
  return new Date(sessionDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatSessionTime(sessionDate: string | Date): string {
  return new Date(sessionDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function getSessionStageDef(sessionStage: string) {
  return STAGES.find((stage) => stage.value === sessionStage);
}

export function getCurriculumOptions(t: Translate) {
  return STAGES
    .filter((stage) => SESSION_STAGE_VALUES.has(stage.value))
    .map((stage) => ({
      value: stage.value,
      label: `${stageLabel(t, stage)}: ${stageTopic(t, stage) ?? ''}`,
    }));
}

/**
 * A session's topic is stored free-text, but sessions created from the
 * curriculum carry the stage's English topic verbatim. When they match, show
 * the translated curriculum title; anything a leader typed is left alone.
 */
export function sessionTopic(t: Translate, session: NewBelieverSession): string {
  const stage = getSessionStageDef(session.sessionStage);
  if (stage?.topic && session.topic === stage.topic) return stageTopic(t, stage) ?? session.topic;
  return session.topic ?? '';
}

export function teacherName(t: Translate, session: NewBelieverSession): string {
  if (!session.teacherFirstName) return t('newBelievers:unassignedTeacher');
  return `${session.teacherFirstName} ${session.teacherLastName ?? ''}`.trim();
}
