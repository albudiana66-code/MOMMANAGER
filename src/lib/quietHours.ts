import type { NotificationSettings } from '../types';

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Handles the overnight wraparound case (e.g. 21:30–07:00 spans midnight).
 * Lives in its own module (not notifications.ts) so lib/nudges.ts can use
 * it too without a circular import — notifications.ts imports
 * buildNudgeCandidates from nudges.ts, so nudges.ts can't import back from
 * notifications.ts.
 */
export function isTimeWithinQuietHours(hhmm: string, quietHours: NotificationSettings['quietHours']): boolean {
  if (!quietHours.enabled) return false;
  const t = minutesOfDay(hhmm);
  const start = minutesOfDay(quietHours.start);
  const end = minutesOfDay(quietHours.end);
  if (start === end) return false;
  if (start < end) return t >= start && t < end;
  return t >= start || t < end;
}
