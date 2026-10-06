import type { ReminderMinutes } from '../types';

/**
 * A weekly recurring activity (e.g. "Swimming every Monday 17:00") — kept
 * as a weekday name + time rather than a specific date, so a reminder for
 * it is scheduled as a repeating weekly local notification instead of a
 * one-off. Shared between KidsScreen (read/write) and lib/notifications.ts
 * (read-only, to build reminder candidates) so both agree on the shape.
 */
export interface Activity {
  id: string;
  name: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string;
  location: string;
  reminder_minutes_before?: ReminderMinutes;
}

const ACTIVITIES_KEY = (kidId: string) => `mm_activities_${kidId}`;

export function loadActivities(kidId: string): Activity[] {
  try { return JSON.parse(localStorage.getItem(ACTIVITIES_KEY(kidId)) || 'null') || []; } catch { return []; }
}

export function saveActivities(kidId: string, activities: Activity[]): void {
  localStorage.setItem(ACTIVITIES_KEY(kidId), JSON.stringify(activities));
}
