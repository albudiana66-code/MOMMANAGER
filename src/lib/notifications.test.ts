import { describe, expect, it } from 'vitest';
import {
  buildAllCandidates,
  buildEventCandidates,
  buildKitchenCandidates,
  buildRoutineReminderCandidates,
  buildTaskCandidates,
  hashNotificationId,
  isTimeWithinQuietHours,
  selectScheduledCandidates,
  type NotificationCandidate,
} from './notifications';
import { DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings, type CalendarEvent, type Kid, type NotificationSettings, type Task } from '../types';

const NOW = new Date(2026, 9, 5, 10, 0, 0); // Mon 5 Oct 2026, 10:00 local

function baseEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    user_id: 'u1',
    title: 'Meeting with Sarah',
    date: '2026-10-05',
    time: '14:00',
    allDay: false,
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'u1',
    title: 'Pay the bill',
    completed: false,
    category: 'personal',
    priority: 'medium',
    due_date: '2026-10-05',
    time: '09:00',
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function emptyData(overrides: Partial<Parameters<typeof buildAllCandidates>[1]> = {}) {
  return {
    tasks: [],
    events: [],
    kids: [] as Kid[],
    milestonesByKid: {},
    activitiesByKid: {},
    meals: [],
    shopping: [],
    routines: [],
    ...overrides,
  };
}

describe('hashNotificationId', () => {
  it('is stable: the same key always produces the same id', () => {
    const a = hashNotificationId('event:abc-123');
    const b = hashNotificationId('event:abc-123');
    expect(a).toBe(b);
  });

  it('produces different ids for different keys', () => {
    expect(hashNotificationId('event:abc-123')).not.toBe(hashNotificationId('task:abc-123'));
  });

  it('always returns a positive 32-bit-safe integer', () => {
    for (const key of ['', 'x', 'event:1', 'selfcare:2026-12-31', 'a'.repeat(500)]) {
      const id = hashNotificationId(key);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(2147483647);
      expect(Number.isInteger(id)).toBe(true);
    }
  });
});

describe('buildEventCandidates', () => {
  it('schedules an event reminder at time - minutesBefore, per the chosen offset', () => {
    const [c] = buildEventCandidates([baseEvent({ reminder_minutes_before: 30 })], 30);
    expect(c.at).toEqual(new Date(2026, 9, 5, 13, 30));
    expect(c.body).toContain('30 minutes');
  });

  it('applies the default reminder to a pre-existing event with no reminder field set', () => {
    const [c] = buildEventCandidates([baseEvent({ reminder_minutes_before: undefined })], 60);
    expect(c.at).toEqual(new Date(2026, 9, 5, 13, 0));
  });

  it('never schedules a reminder when the user explicitly chose none', () => {
    const out = buildEventCandidates([baseEvent({ reminder_minutes_before: null })], 30);
    expect(out).toHaveLength(0);
  });

  it('skips all-day events and events with no time', () => {
    expect(buildEventCandidates([baseEvent({ allDay: true })], 30)).toHaveLength(0);
    expect(buildEventCandidates([baseEvent({ time: undefined })], 30)).toHaveLength(0);
  });
});

describe('buildTaskCandidates', () => {
  it('honours the legacy has_reminder boolean as "at the exact time"', () => {
    const [c] = buildTaskCandidates([baseTask({ has_reminder: true, reminder_minutes_before: undefined })], 30);
    expect(c.at).toEqual(new Date(2026, 9, 5, 9, 0));
  });

  it('a task with has_reminder false/absent and no explicit field gets no reminder', () => {
    expect(buildTaskCandidates([baseTask({ has_reminder: false, reminder_minutes_before: undefined })], 30)).toHaveLength(0);
    expect(buildTaskCandidates([baseTask({ has_reminder: undefined, reminder_minutes_before: undefined })], 30)).toHaveLength(0);
  });

  it('skips completed tasks', () => {
    expect(buildTaskCandidates([baseTask({ completed: true, reminder_minutes_before: 0 })], 30)).toHaveLength(0);
  });
});

describe('isTimeWithinQuietHours', () => {
  const quietHours: NotificationSettings['quietHours'] = { enabled: true, start: '21:30', end: '07:00' };

  it('flags times inside the overnight window', () => {
    expect(isTimeWithinQuietHours('22:00', quietHours)).toBe(true);
    expect(isTimeWithinQuietHours('23:59', quietHours)).toBe(true);
    expect(isTimeWithinQuietHours('00:30', quietHours)).toBe(true);
    expect(isTimeWithinQuietHours('06:59', quietHours)).toBe(true);
  });

  it('does not flag times outside the window', () => {
    expect(isTimeWithinQuietHours('07:00', quietHours)).toBe(false);
    expect(isTimeWithinQuietHours('16:00', quietHours)).toBe(false);
    expect(isTimeWithinQuietHours('21:29', quietHours)).toBe(false);
  });

  it('is always false when quiet hours are disabled', () => {
    expect(isTimeWithinQuietHours('23:00', { ...quietHours, enabled: false })).toBe(false);
  });
});

describe('selectScheduledCandidates', () => {
  function candidate(overrides: Partial<NotificationCandidate> = {}): NotificationCandidate {
    return {
      key: 'k', type: 'event', title: 't', body: 'b', route: '/tasks', itemId: 'i',
      at: new Date(NOW.getTime() + 60_000), isDaily: false,
      ...overrides,
    };
  }
  const noQuietHours: NotificationSettings['quietHours'] = { enabled: false, start: '21:30', end: '07:00' };

  it('never schedules a one-off notification whose time has already passed', () => {
    const past = candidate({ key: 'past', at: new Date(NOW.getTime() - 60_000) });
    const future = candidate({ key: 'future', at: new Date(NOW.getTime() + 60_000) });
    const out = selectScheduledCandidates([past, future], NOW, noQuietHours);
    expect(out.map((c) => c.key)).toEqual(['future']);
  });

  it('caps the list at the given max, keeping the soonest ones', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      candidate({ key: `c${i}`, at: new Date(NOW.getTime() + (80 - i) * 60_000) })
    );
    const out = selectScheduledCandidates(many, NOW, noQuietHours, 60);
    expect(out).toHaveLength(60);
    // Soonest-first: the ones kept should be exactly the 60 with the smallest `at`.
    const sorted = [...many].sort((a, b) => a.at.getTime() - b.at.getTime());
    expect(out.map((c) => c.key)).toEqual(sorted.slice(0, 60).map((c) => c.key));
  });

  it('silences a daily reminder that falls inside quiet hours', () => {
    const quietHours: NotificationSettings['quietHours'] = { enabled: true, start: '21:30', end: '07:00' };
    const daily = candidate({ key: 'daily', isDaily: true, at: new Date(2026, 9, 5, 22, 0) });
    expect(selectScheduledCandidates([daily], NOW, quietHours)).toHaveLength(0);
  });

  it('still fires a user-chosen (non-daily) reminder that happens to land in quiet hours', () => {
    const quietHours: NotificationSettings['quietHours'] = { enabled: true, start: '21:30', end: '07:00' };
    const userChosen = candidate({ key: 'late-event', isDaily: false, at: new Date(2026, 9, 5, 22, 0) });
    expect(selectScheduledCandidates([userChosen], NOW, quietHours)).toHaveLength(1);
  });
});

describe('buildAllCandidates', () => {
  it('produces nothing when the master switch is off', () => {
    const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, enabled: false };
    const out = buildAllCandidates(settings, emptyData({ events: [baseEvent()] }), NOW);
    expect(out).toHaveLength(0);
  });

  it('produces nothing for a disabled category even though the data exists', () => {
    const settings: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      categories: { calendar: false, tasks: false, kids: false, meals: false, selfcare: false },
    };
    const out = buildAllCandidates(settings, emptyData({ events: [baseEvent()], tasks: [baseTask({ reminder_minutes_before: 0 })] }), NOW);
    expect(out).toHaveLength(0);
  });

  it('a deleted item produces no candidate — simulated by it simply being absent from the loaded data', () => {
    const settings = DEFAULT_NOTIFICATION_SETTINGS;
    const withItem = buildAllCandidates(settings, emptyData({ events: [baseEvent({ id: 'to-delete' })] }), NOW);
    expect(withItem.some((c) => c.itemId === 'to-delete')).toBe(true);

    const afterDelete = buildAllCandidates(settings, emptyData({ events: [] }), NOW);
    expect(afterDelete.some((c) => c.itemId === 'to-delete')).toBe(false);
  });

  it('still produces the enabled categories alongside a disabled one', () => {
    const settings: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      categories: { ...DEFAULT_NOTIFICATION_SETTINGS.categories, meals: false, selfcare: false },
    };
    const out = buildAllCandidates(settings, emptyData({ events: [baseEvent()] }), NOW);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((c) => c.type === 'event' || c.type === 'task')).toBe(true);
  });

  it('tasks and calendar are gated independently', () => {
    const tasksOnly: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      categories: { calendar: false, tasks: true, kids: false, meals: false, selfcare: false },
    };
    const out = buildAllCandidates(tasksOnly, emptyData({ events: [baseEvent()], tasks: [baseTask({ reminder_minutes_before: 0 })] }), NOW);
    expect(out.every((c) => c.type === 'task')).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('buildKitchenCandidates', () => {
  it('schedules a per-meal reminder when the meal has its own clock time and a chosen offset', () => {
    const meals = [{ date: '2026-10-05', dinner: { name: 'Lasagne', emoji: '🍝', clockTime: '19:00', reminder_minutes_before: 30 as const } }];
    const out = buildKitchenCandidates(meals, '16:00', NOW);
    const match = out.find((c) => c.itemId === '2026-10-05:dinner');
    expect(match).toBeDefined();
    expect(match!.at).toEqual(new Date(2026, 9, 5, 18, 30));
    expect(match!.title).toContain('Lasagne');
  });

  it('falls back to the global daily dinner reminder when no clock time is set', () => {
    const meals = [{ date: '2026-10-05', dinner: { name: 'Lasagne', emoji: '🍝' } }];
    const out = buildKitchenCandidates(meals, '16:00', NOW);
    const match = out.find((c) => c.itemId === '2026-10-05');
    expect(match).toBeDefined();
    expect(match!.at).toEqual(new Date(2026, 9, 5, 16, 0));
  });

  it('defaults to no reminder for a meal with a clock time but no chosen offset', () => {
    const meals = [{ date: '2026-10-05', dinner: { name: 'Lasagne', clockTime: '19:00' } }];
    const out = buildKitchenCandidates(meals, '16:00', NOW);
    expect(out.find((c) => c.itemId.startsWith('2026-10-05'))).toBeUndefined();
  });
});

describe('buildRoutineReminderCandidates', () => {
  it('produces a recurring daily candidate only for routines with their reminder switched on', () => {
    const routines = [
      { id: 'r1', title: 'Morning', emoji: '🌞', reminderEnabled: true },
      { id: 'r2', title: 'Evening', emoji: '🌙', reminderEnabled: false },
    ];
    const out = buildRoutineReminderCandidates(routines, '20:30', NOW);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('routine:r1');
    expect(out[0].recurringDaily).toBe(true);
    expect(out[0].at.getHours()).toBe(20);
    expect(out[0].at.getMinutes()).toBe(30);
  });
});

describe('normalizeNotificationSettings', () => {
  it('returns the default settings when nothing is saved yet', () => {
    expect(normalizeNotificationSettings(undefined)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('migrates a pre-existing settings object saved before tasks/meals were split out', () => {
    const legacy = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      categories: { calendar: true, kids: true, kitchen: true, shopping: false, selfcare: true } as unknown as NotificationSettings['categories'],
    };
    const normalized = normalizeNotificationSettings(legacy);
    expect(normalized.categories.calendar).toBe(true);
    expect(normalized.categories.tasks).toBe(true); // inherited from the old bundled `calendar`
    expect(normalized.categories.meals).toBe(true); // true because legacy `kitchen` was true
  });
});
