import { LocalNotifications } from '@capacitor/local-notifications';
import type { PermissionStatus } from '@capacitor/local-notifications';
import { isNativeMobile } from './iap';
import i18n from '../i18n';
import type { Activity } from './kidsStorage';
import type { CalendarEvent, Kid, KidMilestone, NotificationSettings, ReminderMinutes, SubscriptionPlan, Task } from '../types';
import { isTimeWithinQuietHours } from './quietHours';
import { buildNudgeCandidates, readNudgeState, writeNudgeState, type NudgeDataBundle } from './nudges';

export { isTimeWithinQuietHours };

// ─────────────────────────────────────────────────────────────────────────────
// This is the ONLY place in the app that schedules, cancels, or reacts to
// taps on local notifications. Every screen that creates/edits/deletes a
// reminder-able item, and the Settings screen, call `syncNotifications()`
// after saving — it re-reads everything from scratch and replaces the
// entire pending set, so there is never a stale notification left over
// from a deleted/edited item.
//
// Everything here except `syncNotifications`/`scheduleTestNotification`/the
// permission + tap-handling functions is a pure function of plain data, on
// purpose, so the scheduling logic (stable ids, past-date filtering, the
// 60-notification cap, quiet hours) can be unit-tested without touching the
// native plugin at all.
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID = 'reminders';
/** iOS allows at most 64 pending local notifications per app — always keep the nearest 64. */
const MAX_SCHEDULED = 64;
/** How many days ahead to generate the daily kitchen/shopping/self-care reminders. Meal plans are only ever filled in a week or two ahead, so there's nothing to gain from looking further out, and every sync (app open/resume) regenerates this window anyway. */
const DAILY_LOOKAHEAD_DAYS = 14;

export type NotificationCategory = 'event' | 'task' | 'milestone' | 'activity' | 'kitchen' | 'shopping' | 'selfcare' | 'nudge';

export interface NotificationCandidate {
  /** Stable string key this candidate's numeric notification id is hashed from. */
  key: string;
  type: NotificationCategory;
  title: string;
  body: string;
  /** Where tapping this notification should navigate to. */
  route: string;
  itemId: string;
  /** The next time this fires — used for past-filtering, quiet-hours, sorting, and capping. For recurring notifications this is their next upcoming occurrence. */
  at: Date;
  /** Daily automatic reminders (kitchen/shopping/selfcare) are silenced during quiet hours; reminders the user explicitly chose a time for (event/task/milestone/activity) are not. */
  isDaily: boolean;
  /** Recurring weekly notification (kids activities) instead of a one-off. */
  recurringWeekday?: number; // Capacitor Weekday: Sunday=1..Saturday=7
  /** Recurring daily notification (self-care routine reminders) instead of a one-off. */
  recurringDaily?: boolean;
}

// ── Stable numeric ids ───────────────────────────────────────────────────────

/**
 * FNV-1a 32-bit hash, masked to a positive int (Capacitor notification ids
 * must fit a Java/Kotlin `int`). Deterministic: the same key always
 * produces the same id, so re-syncing after an edit replaces the same
 * pending notification instead of creating a duplicate.
 */
export function hashNotificationId(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const positive = hash & 0x7fffffff;
  return positive === 0 ? 1 : positive;
}

// ── Time helpers ─────────────────────────────────────────────────────────────

function parseDateTime(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, m ?? 0, 0, 0);
}

function nextWeeklyOccurrence(now: Date, weekdayCapacitor: number, hour: number, minute: number): Date {
  // Capacitor Weekday: Sunday=1..Saturday=7. JS Date#getDay: Sunday=0..Saturday=6.
  const targetJsDay = weekdayCapacitor - 1;
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  let diff = (targetJsDay - now.getDay() + 7) % 7;
  if (diff === 0 && d.getTime() <= now.getTime()) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function humanizeMinutesBefore(minutes: number): string {
  if (minutes >= 1440) return i18n.t('notifications.inDay');
  if (minutes >= 60) return i18n.t('notifications.inHour');
  return i18n.t('notifications.inMinutes', { count: minutes });
}

function startsAtBody(time: string, minutesBefore: number): string {
  return minutesBefore <= 0
    ? i18n.t('notifications.startsAt', { time })
    : i18n.t('notifications.startsAtIn', { time, duration: humanizeMinutesBefore(minutesBefore) });
}

function dueAtBody(time: string, minutesBefore: number): string {
  return minutesBefore <= 0
    ? i18n.t('notifications.dueAt', { time })
    : i18n.t('notifications.dueAtIn', { time, duration: humanizeMinutesBefore(minutesBefore) });
}

// ── Reminder-offset resolution (handles legacy fields + safe defaults) ──────

function resolveTaskReminderMinutes(task: Task): number | null {
  if (task.reminder_minutes_before !== undefined) return task.reminder_minutes_before;
  // Legacy boolean: true meant "remind at the exact due time".
  return task.has_reminder ? 0 : null;
}

function resolveEventReminderMinutes(event: CalendarEvent, defaultMinutes: number): number | null {
  if (event.reminder_minutes_before !== undefined) return event.reminder_minutes_before;
  // CalendarEvent never had a reminder concept before — apply the user's
  // default so pre-existing events get a sensible reminder instead of none.
  return defaultMinutes;
}

function resolveMilestoneReminderMinutes(milestone: KidMilestone, defaultMinutes: number): number | null {
  if (milestone.reminder_minutes_before !== undefined) return milestone.reminder_minutes_before;
  return defaultMinutes;
}

function resolveActivityReminderMinutes(activity: Activity, defaultMinutes: number): number | null {
  if (activity.reminder_minutes_before !== undefined) return activity.reminder_minutes_before;
  return defaultMinutes;
}

// ── Candidate builders (pure — unit-tested directly) ────────────────────────

/** Minutes-before offsets that are always scheduled for every timed event/task, matching the iPhone Calendar app's two default alerts ("1 hour before" and "at the event's start time") — unconditional, independent of any per-item reminder choice. */
const MANDATORY_REMINDER_OFFSETS = [60, 0] as const;

export function buildEventCandidates(events: CalendarEvent[], defaultMinutes: number): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  for (const e of events) {
    if (e.allDay || !e.time) continue;
    const eventAt = parseDateTime(e.date, e.time);

    for (const minutesBefore of MANDATORY_REMINDER_OFFSETS) {
      out.push({
        key: `event:${e.id}:${minutesBefore}`,
        type: 'event',
        title: e.title,
        body: startsAtBody(e.time, minutesBefore),
        route: '/tasks',
        itemId: e.id,
        at: new Date(eventAt.getTime() - minutesBefore * 60_000),
        isDaily: false,
      });
    }

    // A user-chosen custom offset is an extra reminder on top of the two
    // mandatory ones above — skipped when it would just duplicate one of them.
    const customMinutes = resolveEventReminderMinutes(e, defaultMinutes);
    if (customMinutes !== null && !MANDATORY_REMINDER_OFFSETS.includes(customMinutes as 0 | 60)) {
      out.push({
        key: `event:${e.id}:custom`,
        type: 'event',
        title: e.title,
        body: startsAtBody(e.time, customMinutes),
        route: '/tasks',
        itemId: e.id,
        at: new Date(eventAt.getTime() - customMinutes * 60_000),
        isDaily: false,
      });
    }
  }
  return out;
}

export function buildTaskCandidates(tasks: Task[], defaultMinutes: number): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  for (const task of tasks) {
    if (task.completed || !task.due_date || !task.time) continue;
    const dueAt = parseDateTime(task.due_date, task.time);

    for (const minutesBefore of MANDATORY_REMINDER_OFFSETS) {
      out.push({
        key: `task:${task.id}:${minutesBefore}`,
        type: 'task',
        title: task.title,
        body: dueAtBody(task.time, minutesBefore),
        route: '/tasks',
        itemId: task.id,
        at: new Date(dueAt.getTime() - minutesBefore * 60_000),
        isDaily: false,
      });
    }

    // A user-chosen custom offset (legacy has_reminder, or the explicit
    // field) is an extra reminder on top of the two mandatory ones above.
    const customMinutes = resolveTaskReminderMinutes(task);
    if (customMinutes !== null && !MANDATORY_REMINDER_OFFSETS.includes(customMinutes as 0 | 60)) {
      out.push({
        key: `task:${task.id}:custom`,
        type: 'task',
        title: task.title,
        body: dueAtBody(task.time, customMinutes),
        route: '/tasks',
        itemId: task.id,
        at: new Date(dueAt.getTime() - customMinutes * 60_000),
        isDaily: false,
      });
    }
  }
  // defaultMinutes is unused for tasks today (they only use their own/legacy field) —
  // kept as a parameter for symmetry with the other builders and in case a
  // future default-for-new-tasks setting is added.
  void defaultMinutes;
  return out;
}

export function buildMilestoneCandidates(milestones: KidMilestone[], kidName: string, defaultMinutes: number): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  for (const m of milestones) {
    if (!m.time) continue; // all-day milestone — nothing to time a reminder against
    const minutesBefore = resolveMilestoneReminderMinutes(m, defaultMinutes);
    if (minutesBefore === null) continue;
    const at = new Date(parseDateTime(m.date, m.time).getTime() - minutesBefore * 60_000);
    out.push({
      key: `milestone:${m.id}`,
      type: 'milestone',
      title: `${m.title} — ${kidName}`,
      body: startsAtBody(m.time, minutesBefore),
      route: '/kids',
      itemId: m.id,
      at,
      isDaily: false,
    });
  }
  return out;
}

export function buildActivityCandidates(activities: Activity[], kidName: string, defaultMinutes: number, now: Date): NotificationCandidate[] {
  const WEEKDAY_INDEX: Record<string, number> = {
    sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6, saturday: 7,
  };
  const out: NotificationCandidate[] = [];
  for (const a of activities) {
    if (!a.time) continue;
    const minutesBefore = resolveActivityReminderMinutes(a, defaultMinutes);
    if (minutesBefore === null) continue;
    const weekday = WEEKDAY_INDEX[a.day];
    if (!weekday) continue;
    const [h, m] = a.time.split(':').map(Number);
    let reminderHour = h ?? 0;
    let reminderMinute = (m ?? 0) - minutesBefore;
    let reminderWeekday = weekday;
    while (reminderMinute < 0) {
      reminderMinute += 60;
      reminderHour -= 1;
    }
    while (reminderHour < 0) {
      reminderHour += 24;
      // Capacitor Weekday wraps Sunday(1)..Saturday(7).
      reminderWeekday = reminderWeekday === 1 ? 7 : reminderWeekday - 1;
    }
    out.push({
      key: `activity:${a.id}`,
      type: 'activity',
      title: `${a.name} — ${kidName}`,
      body: startsAtBody(a.time, minutesBefore),
      route: '/kids',
      itemId: a.id,
      at: nextWeeklyOccurrence(now, reminderWeekday, reminderHour, reminderMinute),
      isDaily: false,
      recurringWeekday: reminderWeekday,
    });
  }
  return out;
}

export interface MealSlotLike {
  name: string;
  emoji?: string;
  /** Optional "HH:mm" clock time set manually on the meal itself — never the AI generator's prep-duration string. */
  clockTime?: string;
  /** None by default — meal reminders are opt-in per item. */
  reminder_minutes_before?: ReminderMinutes;
}

export interface DayMealPlan {
  date: string; // 'yyyy-MM-dd'
  breakfast?: MealSlotLike;
  lunch?: MealSlotLike;
  dinner?: MealSlotLike;
}

const MEAL_SLOT_KEYS = ['breakfast', 'lunch', 'dinner'] as const;

export function buildKitchenCandidates(meals: DayMealPlan[], reminderTime: string, now: Date): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  const byDate = new Map(meals.map((d) => [d.date, d]));
  for (let i = 0; i < DAILY_LOOKAHEAD_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = toDateKey(day);
    const plan = byDate.get(dateStr);
    if (!plan) continue;

    // A dinner with its own clock time has opted into the per-item reminder
    // flow — even if it ends up with no reminder (None chosen), the old
    // always-on global fallback below must not kick back in for it.
    const optedIntoPerItemReminders = MEAL_SLOT_KEYS.some((slot) => !!plan[slot]?.clockTime);

    for (const slot of MEAL_SLOT_KEYS) {
      const meal = plan[slot];
      // None by default — reminder_minutes_before undefined/null skips it.
      if (!meal?.name || !meal.clockTime || meal.reminder_minutes_before == null) continue;
      const at = new Date(parseDateTime(dateStr, meal.clockTime).getTime() - meal.reminder_minutes_before * 60_000);
      out.push({
        key: `kitchen:${dateStr}:${slot}`,
        type: 'kitchen',
        title: `${meal.emoji ?? ''} ${meal.name}`.trim(),
        body: startsAtBody(meal.clockTime, meal.reminder_minutes_before),
        route: '/kitchen',
        itemId: `${dateStr}:${slot}`,
        at,
        isDaily: false,
      });
    }

    // Legacy fallback: a dinner with no clock time of its own keeps the old
    // single daily "tonight's dinner" reminder at the global kitchen time.
    if (!optedIntoPerItemReminders && plan.dinner?.name) {
      const at = parseDateTime(dateStr, reminderTime);
      out.push({
        key: `kitchen:${dateStr}`,
        type: 'kitchen',
        title: i18n.t('notifications.kitchenTitle'),
        body: i18n.t('notifications.tonightMeal', { meal: `${plan.dinner.emoji ?? ''} ${plan.dinner.name}`.trim() }),
        route: '/kitchen',
        itemId: dateStr,
        at,
        isDaily: true,
      });
    }
  }
  return out;
}

export interface ShoppingItemLike {
  checked: boolean;
}

export function buildShoppingCandidates(items: ShoppingItemLike[], reminderTime: string, now: Date): NotificationCandidate[] {
  const pending = items.filter((i) => !i.checked).length;
  if (pending === 0) return [];
  const out: NotificationCandidate[] = [];
  for (let i = 0; i < DAILY_LOOKAHEAD_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = toDateKey(day);
    const at = parseDateTime(dateStr, reminderTime);
    out.push({
      key: `shopping:${dateStr}`,
      type: 'shopping',
      title: i18n.t('notifications.shoppingTitle'),
      body: i18n.t('notifications.shoppingReminder', { count: pending }),
      route: '/kitchen',
      itemId: dateStr,
      at,
      isDaily: true,
    });
  }
  return out;
}

const SELFCARE_MESSAGE_KEYS = ['selfcare1', 'selfcare2', 'selfcare3', 'selfcare4', 'selfcare5'];

export function buildSelfCareCandidates(reminderTime: string, now: Date): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  for (let i = 0; i < DAILY_LOOKAHEAD_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = toDateKey(day);
    const at = parseDateTime(dateStr, reminderTime);
    const messageKey = SELFCARE_MESSAGE_KEYS[i % SELFCARE_MESSAGE_KEYS.length];
    out.push({
      key: `selfcare:${dateStr}`,
      type: 'selfcare',
      title: i18n.t('notifications.selfcareTitle'),
      body: i18n.t(`notifications.${messageKey}`),
      route: '/selfcare',
      itemId: dateStr,
      at,
      isDaily: true,
    });
  }
  return out;
}

export interface RoutineLike {
  id: string;
  title: string;
  emoji?: string;
  reminderEnabled?: boolean;
}

/** One recurring daily notification per routine with its reminder switched on, firing at the global self-care reminder time — separate from (and in addition to) the generic rotating self-care tips below. */
export function buildRoutineReminderCandidates(routines: RoutineLike[], reminderTime: string, now: Date): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  const [hour, minute] = reminderTime.split(':').map(Number);
  for (const routine of routines) {
    if (!routine.reminderEnabled) continue;
    const at = new Date(now);
    at.setHours(hour ?? 0, minute ?? 0, 0, 0);
    out.push({
      key: `routine:${routine.id}`,
      type: 'selfcare',
      title: `${routine.emoji ?? ''} ${routine.title}`.trim(),
      body: i18n.t('notifications.routineReminder'),
      route: '/selfcare',
      itemId: routine.id,
      at,
      isDaily: true,
      recurringDaily: true,
    });
  }
  return out;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Filtering, quiet hours, capping (pure — unit-tested directly) ──────────

/**
 * Never schedule in the past, silence daily automatic reminders that fall
 * inside quiet hours, sort by soonest-first, and cap at `max` (iOS allows
 * at most 64 pending local notifications total).
 */
export function selectScheduledCandidates(
  candidates: NotificationCandidate[],
  now: Date,
  quietHours: NotificationSettings['quietHours'],
  max: number = MAX_SCHEDULED
): NotificationCandidate[] {
  return candidates
    .filter((c) => c.recurringWeekday !== undefined || c.recurringDaily || c.at.getTime() > now.getTime())
    .filter((c) => {
      if (!c.isDaily) return true;
      const hhmm = `${String(c.at.getHours()).padStart(2, '0')}:${String(c.at.getMinutes()).padStart(2, '0')}`;
      return !isTimeWithinQuietHours(hhmm, quietHours);
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, max);
}

// ── Capacitor scheduling (impure) ───────────────────────────────────────────

function toSchedule(c: NotificationCandidate) {
  if (c.recurringWeekday !== undefined) {
    return {
      on: { weekday: c.recurringWeekday, hour: c.at.getHours(), minute: c.at.getMinutes() },
      allowWhileIdle: true,
    };
  }
  if (c.recurringDaily) {
    // Omitting `weekday`/`day` from `on` makes this recur every day at this time.
    return { on: { hour: c.at.getHours(), minute: c.at.getMinutes() }, allowWhileIdle: true };
  }
  return { at: c.at, allowWhileIdle: true };
}

async function scheduleAll(candidates: NotificationCandidate[]): Promise<void> {
  await LocalNotifications.cancelAll().catch(() => {});
  if (candidates.length === 0) return;
  await LocalNotifications.schedule({
    notifications: candidates.map((c) => ({
      id: hashNotificationId(c.key),
      title: c.title,
      body: c.body,
      channelId: CHANNEL_ID,
      schedule: toSchedule(c),
      isExactNotification: false,
      extra: { type: c.type, itemId: c.itemId, route: c.route },
    })),
  });
}

// ── localStorage readers (mirrors the key functions in each screen) ────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadTasksLocal(uid: string): Task[] { return readJSON(`mm_tasks_${uid}`, []); }
function loadEventsLocal(uid: string): CalendarEvent[] { return readJSON(`mm_events_${uid}`, []); }
function loadKidsLocal(uid: string): Kid[] { return readJSON(`mm_kids_${uid}`, []); }
function loadMilestonesLocal(kidId: string): KidMilestone[] { return readJSON(`mm_milestones_${kidId}`, []); }
function loadActivitiesLocal(kidId: string): Activity[] { return readJSON(`mm_activities_${kidId}`, []); }
function loadMealsLocal(uid: string): DayMealPlan[] { return readJSON(`mm_meals_${uid}`, []); }
function loadShoppingLocal(uid: string): ShoppingItemLike[] { return readJSON(`mm_shopping_${uid}`, []); }
function loadRoutinesLocal(uid: string): RoutineLike[] {
  return readJSON<{ routines: RoutineLike[] }>(`mm_routines_${uid}`, { routines: [] }).routines ?? [];
}
function loadSelfCareCompletedDatesLocal(uid: string): string[] {
  return readJSON<{ completedDates: string[] }>(`mm_routines_${uid}`, { completedDates: [] }).completedDates ?? [];
}

/** Pure: assembles every candidate reminder from already-loaded data + settings, with no native calls — this is what the unit tests exercise directly. */
export function buildAllCandidates(
  settings: NotificationSettings,
  data: {
    tasks: Task[];
    events: CalendarEvent[];
    kids: Kid[];
    milestonesByKid: Record<string, KidMilestone[]>;
    activitiesByKid: Record<string, Activity[]>;
    meals: DayMealPlan[];
    shopping: ShoppingItemLike[];
    routines: RoutineLike[];
  },
  now: Date
): NotificationCandidate[] {
  if (!settings.enabled) return [];
  const out: NotificationCandidate[] = [];

  if (settings.categories.calendar) {
    out.push(...buildEventCandidates(data.events, settings.defaultReminderMinutes));
  }
  if (settings.categories.tasks) {
    out.push(...buildTaskCandidates(data.tasks, settings.defaultReminderMinutes));
  }
  if (settings.categories.kids) {
    for (const kid of data.kids) {
      out.push(...buildMilestoneCandidates(data.milestonesByKid[kid.id] ?? [], kid.name, settings.defaultReminderMinutes));
      out.push(...buildActivityCandidates(data.activitiesByKid[kid.id] ?? [], kid.name, settings.defaultReminderMinutes, now));
    }
  }
  if (settings.categories.meals) {
    out.push(...buildKitchenCandidates(data.meals, settings.kitchenReminderTime, now));
    out.push(...buildShoppingCandidates(data.shopping, settings.kitchenReminderTime, now));
  }
  if (settings.categories.selfcare) {
    out.push(...buildSelfCareCandidates(settings.selfcareReminderTime, now));
    out.push(...buildRoutineReminderCandidates(data.routines, settings.selfcareReminderTime, now));
  }
  return out;
}

/** Subscription context the upgrade nudges need — omit it (e.g. a call site with no easy access to the profile) and upgrade nudges simply never fire; planning nudges are unaffected. */
export interface NudgeSubscriptionContext {
  plan: SubscriptionPlan;
  isFreeTrial: boolean;
  trialStartDate: Date | null;
}

const NO_UPGRADE_NUDGE_CONTEXT: NudgeSubscriptionContext = { plan: null, isFreeTrial: false, trialStartDate: null };

/**
 * Re-reads the signed-in user's data + settings, cancels every pending
 * MomManager notification, and schedules the fresh list. Call this on app
 * start, on app resume, after login, and after any create/edit/delete of
 * an event, task, kids item, meal, shopping item, or notification setting.
 * `userId: null` (e.g. after logout) just clears everything. A safe no-op
 * on web — no native calls, no permission prompts.
 */
export async function syncNotifications(
  userId: string | null,
  settings: NotificationSettings,
  subscriptionContext: NudgeSubscriptionContext = NO_UPGRADE_NUDGE_CONTEXT
): Promise<void> {
  if (!isNativeMobile()) return;
  if (!userId) {
    await LocalNotifications.cancelAll().catch(() => {});
    return;
  }
  if (!settings.enabled) {
    await LocalNotifications.cancelAll().catch(() => {});
    return;
  }
  const perm = await LocalNotifications.checkPermissions().catch((): PermissionStatus => ({ display: 'denied' }));
  if (perm.display !== 'granted') {
    await LocalNotifications.cancelAll().catch(() => {});
    return;
  }

  const kids = loadKidsLocal(userId);
  const milestonesByKid: Record<string, KidMilestone[]> = {};
  const activitiesByKid: Record<string, Activity[]> = {};
  for (const kid of kids) {
    milestonesByKid[kid.id] = loadMilestonesLocal(kid.id);
    activitiesByKid[kid.id] = loadActivitiesLocal(kid.id);
  }

  const now = new Date();
  const tasks = loadTasksLocal(userId);
  const events = loadEventsLocal(userId);
  const meals = loadMealsLocal(userId);
  const candidates = buildAllCandidates(
    settings,
    {
      tasks,
      events,
      kids,
      milestonesByKid,
      activitiesByKid,
      meals,
      shopping: loadShoppingLocal(userId),
      routines: loadRoutinesLocal(userId),
    },
    now
  );

  if (settings.enabled && (settings.planningNudges || settings.upgradeNudges)) {
    const nudgeState = readNudgeState(userId);
    const nudgeData: NudgeDataBundle = {
      events,
      tasks,
      meals,
      kids,
      activitiesByKid,
      selfcareCompletedDates: loadSelfCareCompletedDatesLocal(userId),
      ...subscriptionContext,
    };
    const { candidates: nudgeCandidates, nextState } = buildNudgeCandidates(settings, nudgeData, nudgeState, now);
    candidates.push(...nudgeCandidates);
    writeNudgeState(userId, nextState);
  }

  const selected = selectScheduledCandidates(candidates, now, settings.quietHours);
  await scheduleAll(selected);
}

/** Cancels every pending MomManager notification — called on logout. */
export async function cancelAllNotifications(): Promise<void> {
  if (!isNativeMobile()) return;
  await LocalNotifications.cancelAll().catch(() => {});
}

/** Number of MomManager notifications currently scheduled with the OS — logged after every schedule call, and surfaced in the debug panel, so a "nothing happened" report can be told apart from "it scheduled but never fired". */
export async function getPendingNotificationCount(): Promise<number> {
  if (!isNativeMobile()) return 0;
  const { notifications } = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
  return notifications.length;
}

/** Fires in 5 seconds so the user can check notifications actually work (Settings "Send test notification" button). Logs the permission status and the resulting pending count so a silent failure (e.g. permission actually denied, or the plugin not reachable) shows up in the console instead of just "nothing happened". */
export async function scheduleTestNotification(): Promise<void> {
  if (!isNativeMobile()) return;
  const perm = await checkNotificationPermission();
  console.log('[Notifications] scheduleTestNotification — permission status:', perm);
  if (perm !== 'granted') {
    console.error('[Notifications] scheduleTestNotification — permission not granted, OS will not show it:', perm);
  }
  await LocalNotifications.schedule({
    notifications: [{
      id: hashNotificationId('test-notification'),
      title: i18n.t('notifications.testTitle'),
      body: i18n.t('notifications.testBody'),
      channelId: CHANNEL_ID,
      schedule: { at: new Date(Date.now() + 5_000), allowWhileIdle: true },
      isExactNotification: false,
      extra: { type: 'test', itemId: 'test', route: '/settings' },
    }],
  });
  const pendingCount = await getPendingNotificationCount();
  console.log('[Notifications] scheduleTestNotification — pending notifications after scheduling:', pendingCount);
}

// ── Permissions ──────────────────────────────────────────────────────────────

export type NotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativeMobile()) return 'unsupported';
  const status = await LocalNotifications.checkPermissions().catch((): PermissionStatus => ({ display: 'prompt' }));
  return status.display as NotificationPermission;
}

/** Shows the OS permission dialog. Callers are expected to have already shown the friendly in-app explanation screen first — this never happens on its own. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativeMobile()) return 'unsupported';
  const status = await LocalNotifications.requestPermissions();
  console.log('[Notifications] requestNotificationPermission — result:', status.display);
  return status.display as NotificationPermission;
}

/** Creates (or updates) the Android notification channel every reminder is posted to: heads-up banner, default sound, vibration, visible on the lock screen. No-op on iOS/web. */
export async function ensureNotificationChannel(): Promise<void> {
  if (!isNativeMobile()) return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: i18n.t('notifications.channelName'),
    description: i18n.t('notifications.channelDescription'),
    importance: 4, // IMPORTANCE_HIGH — heads-up banner + sound
    visibility: 1, // VISIBILITY_PUBLIC — full content on the lock screen
    vibration: true,
  }).catch(() => {});
}

// ── Tap handling / deep links ───────────────────────────────────────────────
//
// Tapping a notification should open the exact item it's about — including
// when the tap is what launches the app from a cold start, before any
// router exists yet. `initNotificationTapHandling()` is called once at app
// boot (main.tsx) and just buffers the tap's { type, itemId, route } until
// `registerDeepLinkHandler()` is called once the router has mounted
// (useNotificationDeepLink hook) — whichever happens second drains the
// other, so neither a cold-start tap nor a late-registering router can
// lose the navigation.

export interface NotificationDeepLink {
  type: string;
  itemId: string;
  route: string;
}

let pendingDeepLink: NotificationDeepLink | null = null;
let deepLinkHandler: ((link: NotificationDeepLink) => void) | null = null;
let tapListenerAttached = false;

function deliverDeepLink(link: NotificationDeepLink): void {
  if (deepLinkHandler) deepLinkHandler(link);
  else pendingDeepLink = link;
}

/** Call once at app startup. Safe no-op on web. */
export function initNotificationTapHandling(): void {
  if (!isNativeMobile() || tapListenerAttached) return;
  tapListenerAttached = true;
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const extra = action.notification.extra as Partial<NotificationDeepLink> | undefined;
    if (extra?.route && extra.type && extra.itemId) {
      deliverDeepLink({ type: extra.type, itemId: extra.itemId, route: extra.route });
    }
  });
}

/** Registers the router's navigation callback; immediately delivers a tap that arrived before this was called (e.g. a cold start). Returns an unsubscribe function. */
export function registerDeepLinkHandler(handler: (link: NotificationDeepLink) => void): () => void {
  deepLinkHandler = handler;
  if (pendingDeepLink) {
    const link = pendingDeepLink;
    pendingDeepLink = null;
    handler(link);
  }
  return () => {
    if (deepLinkHandler === handler) deepLinkHandler = null;
  };
}
