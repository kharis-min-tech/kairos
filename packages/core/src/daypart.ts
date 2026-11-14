/**
 * Which quarter of the day it is, for the auth field's time-of-day light.
 *
 * Shared so web and mobile cut the day at the same hours — a congregant who
 * opens the app at dusk and the website a minute later should not see two
 * different skies.
 */
export type Daypart = 'dawn' | 'day' | 'dusk' | 'night';

export function resolveDaypart(hour: number): Daypart {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}
