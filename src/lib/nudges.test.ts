import { describe, expect, it } from 'vitest';
import {
  buildNudgeCandidates,
  isCalendarEmptyNext7Days,
  isNoKidsActivityThisWeek,
  isNoMealsPlannedTomorrow,
  isNoSelfCareInLastNDays,
  isUpgradeNudgeEligiblePlan,
  type NudgeDataBundle,
  type NudgeStateMap,
} from './nudges';
import { DEFAULT_NOTIFICATION_SETTINGS, type CalendarEvent, type Kid, type NotificationSettings, type Task } from '../types';
import type { DayMealPlan } from './notifications';
import type { Activity } from './kidsStorage';

// Wednesday 8 Oct 2026, 10:00 local — chosen so "next Sunday"/"next Wednesday" land predictably.
const NOW = new Date(2026, 9, 7, 10, 0, 0);

function baseData(overrides: Partial<NudgeDataBundle> = {}): NudgeDataBundle {
  return {
    events: [],
    tasks: [],
    meals: [],
    kids: [],
    activitiesByKid: {},
    selfcareCompletedDates: [],
    plan: 'standard_monthly',
    isFreeTrial: false,
    trialStartDate: null,
    ...overrides,
  };
}

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id: 'e1', user_id: 'u1', title: 'x', date: '2026-10-08', allDay: false, created_at: '', ...overrides };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', user_id: 'u1', title: 'x', completed: false, category: 'personal', priority: 'medium',
    due_date: '2026-10-08', created_at: '', ...overrides,
  };
}

function kid(overrides: Partial<Kid> = {}): Kid {
  return { id: 'k1', user_id: 'u1', name: 'Kid', birthdate: '2020-01-01', created_at: '', ...overrides };
}

describe('isCalendarEmptyNext7Days', () => {
  it('is true with no events or tasks', () => {
    expect(isCalendarEmptyNext7Days([], [], NOW)).toBe(true);
  });

  it('is false when an event falls within the next 7 days', () => {
    expect(isCalendarEmptyNext7Days([event({ date: '2026-10-10' })], [], NOW)).toBe(false);
  });

  it('is false when an incomplete task is due within the next 7 days', () => {
    expect(isCalendarEmptyNext7Days([], [task({ due_date: '2026-10-09' })], NOW)).toBe(false);
  });

  it('ignores a completed task', () => {
    expect(isCalendarEmptyNext7Days([], [task({ due_date: '2026-10-09', completed: true })], NOW)).toBe(true);
  });

  it('ignores events/tasks outside the 7-day window', () => {
    expect(isCalendarEmptyNext7Days([event({ date: '2026-10-20' })], [task({ due_date: '2026-10-20' })], NOW)).toBe(true);
  });
});

describe('isNoMealsPlannedTomorrow', () => {
  const tomorrow = '2026-10-08';

  it('is true when there is no plan at all for tomorrow', () => {
    expect(isNoMealsPlannedTomorrow([], NOW)).toBe(true);
  });

  it('is true when tomorrow has a plan entry but no meals set', () => {
    const meals: DayMealPlan[] = [{ date: tomorrow }];
    expect(isNoMealsPlannedTomorrow(meals, NOW)).toBe(true);
  });

  it('is false when any meal is set for tomorrow', () => {
    const meals: DayMealPlan[] = [{ date: tomorrow, dinner: { name: 'Pasta' } }];
    expect(isNoMealsPlannedTomorrow(meals, NOW)).toBe(false);
  });
});

describe('isNoKidsActivityThisWeek', () => {
  it('is false (nothing to nudge about) when there are no kids', () => {
    expect(isNoKidsActivityThisWeek([], {})).toBe(false);
  });

  it('is true when the only kid has zero activities', () => {
    expect(isNoKidsActivityThisWeek([kid()], {})).toBe(true);
  });

  it('is false when any kid has at least one activity', () => {
    const activities: Activity[] = [{ id: 'a1', name: 'Swimming', day: 'monday', time: '17:00', location: '' }];
    expect(isNoKidsActivityThisWeek([kid()], { k1: activities })).toBe(false);
  });
});

describe('isNoSelfCareInLastNDays', () => {
  it('is true with no completed dates', () => {
    expect(isNoSelfCareInLastNDays([], NOW, 3)).toBe(true);
  });

  it('is false when a completed date falls within the window', () => {
    expect(isNoSelfCareInLastNDays(['2026-10-06'], NOW, 3)).toBe(false);
  });

  it('is true when the only completed date is older than the window', () => {
    expect(isNoSelfCareInLastNDays(['2026-10-01'], NOW, 3)).toBe(true);
  });
});

describe('isUpgradeNudgeEligiblePlan', () => {
  it('is false for pro plans regardless of anything else', () => {
    expect(isUpgradeNudgeEligiblePlan('pro_yearly', false, null, NOW)).toBe(false);
  });

  it('is true for a standard plan', () => {
    expect(isUpgradeNudgeEligiblePlan('standard_monthly', false, null, NOW)).toBe(true);
  });

  it('is false during the first 3 days of a free trial', () => {
    const trialStart = new Date(2026, 9, 6); // 1 day before NOW
    expect(isUpgradeNudgeEligiblePlan('free_trial', true, trialStart, NOW)).toBe(false);
  });

  it('is true once the trial is older than 3 days', () => {
    const trialStart = new Date(2026, 9, 1); // 6 days before NOW
    expect(isUpgradeNudgeEligiblePlan('free_trial', true, trialStart, NOW)).toBe(true);
  });

  it('is false for a free trial with no known start date', () => {
    expect(isUpgradeNudgeEligiblePlan('free_trial', true, null, NOW)).toBe(false);
  });
});

describe('buildNudgeCandidates — planning nudges', () => {
  it('produces nothing when planningNudges is off, even if every condition is true', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, planningNudges: false };
    const { candidates } = buildNudgeCandidates(settings, baseData(), {}, NOW);
    expect(candidates).toHaveLength(0);
  });

  it('schedules the calendar-empty nudge for the next Sunday at 19:00, routed to /tasks', () => {
    const { candidates } = buildNudgeCandidates(DEFAULT_NOTIFICATION_SETTINGS, baseData(), {}, NOW);
    const c = candidates.find((x) => x.itemId === 'planning_calendar_empty');
    expect(c).toBeDefined();
    expect(c!.route).toBe('/tasks');
    expect(c!.at.getDay()).toBe(0);
    expect(c!.at.getHours()).toBe(19);
  });

  it('does not schedule the calendar-empty nudge when an event exists in the next 7 days', () => {
    const data = baseData({ events: [event({ date: '2026-10-10' })] });
    const { candidates } = buildNudgeCandidates(DEFAULT_NOTIFICATION_SETTINGS, data, {}, NOW);
    expect(candidates.some((c) => c.itemId === 'planning_calendar_empty')).toBe(false);
  });

  it('skips a nudge type shown within the last 3 days (same-type cooldown)', () => {
    const state: NudgeStateMap = {
      planning_calendar_empty: { lastShownAt: new Date(2026, 9, 6).toISOString(), consecutiveIgnored: 0 },
    };
    const { candidates } = buildNudgeCandidates(DEFAULT_NOTIFICATION_SETTINGS, baseData(), state, NOW);
    expect(candidates.some((c) => c.itemId === 'planning_calendar_empty')).toBe(false);
  });

  it('respects quiet hours — a nudge whose time falls inside them is skipped', () => {
    const settings: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      quietHours: { enabled: true, start: '19:00', end: '23:00' }, // covers the Sunday 19:00 calendar nudge
    };
    const { candidates } = buildNudgeCandidates(settings, baseData(), {}, NOW);
    expect(candidates.some((c) => c.itemId === 'planning_calendar_empty')).toBe(false);
  });

  it('caps at 1 nudge per calendar day, keeping the higher-priority (earlier-listed) type', () => {
    // No kids activity (Wednesday 16:00) and no self-care (today 20:00 since NOW is a Wednesday before 20:00)
    // both land on the same day as NOW only if NOW itself is Wednesday — it is (2026-10-07).
    const data = baseData({ kids: [kid()], selfcareCompletedDates: [] });
    const { candidates } = buildNudgeCandidates(DEFAULT_NOTIFICATION_SETTINGS, data, {}, NOW);
    const sameDay = candidates.filter((c) => c.at.toDateString() === candidates[0]?.at.toDateString());
    // Only one candidate should win the day it's scheduled on — verify no two candidates share a calendar date.
    const dates = candidates.map((c) => c.at.toDateString());
    expect(new Set(dates).size).toBe(dates.length);
    expect(sameDay.length).toBeLessThanOrEqual(1);
  });

  // These two tests use an evening "now" (18:00) rather than the file-level
  // NOW (10:00) — at 10:00, today's meals nudge (17:00) and today's
  // self-care nudge (20:00) both land on the same calendar day, and the
  // max-1-per-day rule would non-deterministically swallow the self-care
  // candidate these tests are isolating. At 18:00, the meals nudge (17:00
  // already passed) rolls to tomorrow, leaving self-care alone on today.
  const EVENING_NOW = new Date(2026, 9, 7, 18, 0, 0);

  it('pauses a nudge type for 2 weeks after 3 consecutive ignored occurrences, and resumes after the pause expires', () => {
    let state: NudgeStateMap = {};
    const data = baseData({ selfcareCompletedDates: [] });
    const settings = DEFAULT_NOTIFICATION_SETTINGS;

    // Simulate 3 cycles where the nudge fires and is never tapped before the next evaluation.
    for (let i = 0; i < 3; i++) {
      const cycleNow = new Date(EVENING_NOW.getTime() + i * 4 * 86_400_000); // 4 days apart — clears the 3-day cooldown each time
      const result = buildNudgeCandidates(settings, data, state, cycleNow);
      expect(result.candidates.some((c) => c.itemId === 'planning_no_selfcare')).toBe(true);
      state = result.nextState;
      // Advance "now" past the scheduled fire time without a tap before the next cycle picks it up again.
      const shownAt = new Date(state.planning_no_selfcare!.lastShownAt!);
      state = { ...state, planning_no_selfcare: { ...state.planning_no_selfcare!, lastShownAt: new Date(shownAt.getTime() - 1).toISOString() } };
    }

    // 4th evaluation: should now be paused, not scheduled.
    const fourthNow = new Date(EVENING_NOW.getTime() + 3 * 4 * 86_400_000);
    const fourth = buildNudgeCandidates(settings, data, state, fourthNow);
    expect(fourth.candidates.some((c) => c.itemId === 'planning_no_selfcare')).toBe(false);
    expect(fourth.nextState.planning_no_selfcare?.pausedUntil).toBeDefined();

    // After the pause window, it should fire again.
    const pausedUntil = new Date(fourth.nextState.planning_no_selfcare!.pausedUntil!);
    const afterPause = new Date(pausedUntil.getTime() + 86_400_000);
    const resumed = buildNudgeCandidates(settings, data, fourth.nextState, afterPause);
    expect(resumed.candidates.some((c) => c.itemId === 'planning_no_selfcare')).toBe(true);
  });

  it('resets the ignored streak when the previous occurrence was tapped', () => {
    const shown = new Date(2026, 9, 1);
    const tapped = new Date(2026, 9, 1, 12, 0);
    const state: NudgeStateMap = {
      planning_no_selfcare: { lastShownAt: shown.toISOString(), lastTappedAt: tapped.toISOString(), consecutiveIgnored: 2 },
    };
    const data = baseData({ selfcareCompletedDates: [] });
    const { nextState } = buildNudgeCandidates(DEFAULT_NOTIFICATION_SETTINGS, data, state, EVENING_NOW);
    expect(nextState.planning_no_selfcare?.consecutiveIgnored).toBe(0);
  });
});

describe('buildNudgeCandidates — upgrade nudges', () => {
  it('produces nothing when upgradeNudges is off, even for an eligible standard user', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, upgradeNudges: false, planningNudges: false };
    const data = baseData({ plan: 'standard_monthly' });
    const { candidates } = buildNudgeCandidates(settings, data, {}, NOW);
    expect(candidates).toHaveLength(0);
  });

  it('schedules an upgrade nudge routed to /paywall for an eligible standard user', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, upgradeNudges: true, planningNudges: false };
    const data = baseData({ plan: 'standard_monthly' });
    const { candidates } = buildNudgeCandidates(settings, data, {}, NOW);
    const c = candidates.find((x) => x.itemId.startsWith('upgrade_'));
    expect(c).toBeDefined();
    expect(c!.route).toBe('/paywall');
  });

  it('never schedules an upgrade nudge for a pro user', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, upgradeNudges: true, planningNudges: false };
    const data = baseData({ plan: 'pro_yearly' });
    const { candidates } = buildNudgeCandidates(settings, data, {}, NOW);
    expect(candidates.some((c) => c.itemId.startsWith('upgrade_'))).toBe(false);
  });

  it('does not repeat an upgrade nudge within 7 days of the last one (across all 3 message types)', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, upgradeNudges: true, planningNudges: false };
    const data = baseData({ plan: 'standard_monthly' });
    const state: NudgeStateMap = {
      upgrade_budget: { lastShownAt: new Date(2026, 9, 3).toISOString(), consecutiveIgnored: 0 }, // 4 days before NOW
    };
    const { candidates } = buildNudgeCandidates(settings, data, state, NOW);
    expect(candidates.some((c) => c.itemId.startsWith('upgrade_'))).toBe(false);
  });

  it('rotates to the least-recently-shown upgrade message', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, upgradeNudges: true, planningNudges: false };
    const data = baseData({ plan: 'standard_monthly' });
    const longAgo = new Date(2026, 8, 1).toISOString(); // well over a week ago
    const state: NudgeStateMap = {
      upgrade_budget: { lastShownAt: longAgo, consecutiveIgnored: 0 },
      upgrade_nutrition: { lastShownAt: longAgo, consecutiveIgnored: 0 },
      // upgrade_recap never shown — should be picked as "least recently shown".
    };
    const { candidates } = buildNudgeCandidates(settings, data, state, NOW);
    expect(candidates.find((c) => c.itemId.startsWith('upgrade_'))?.itemId).toBe('upgrade_recap');
  });
});
