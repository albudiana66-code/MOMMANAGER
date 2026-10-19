import i18n from '../i18n';
import { isTimeWithinQuietHours } from './quietHours';
import type { Activity } from './kidsStorage';
import type { CalendarEvent, Kid, NotificationSettings, SubscriptionPlan, Task } from '../types';
import type { DayMealPlan, NotificationCandidate } from './notifications';

// ─────────────────────────────────────────────────────────────────────────────
// "Smart" engagement nudges — data-driven local notifications, re-evaluated
// from scratch on every syncNotifications() call (app open / data change),
// unlike the fixed per-item reminders elsewhere in lib/notifications.ts.
// Two independent settings gate them (NotificationSettings.planningNudges,
// .upgradeNudges), and both are subject to the throttling rules in this
// file — max 1 nudge/day total, no repeat of the same type within 3 days,
// and a 2-week pause after 3 consecutive ignored occurrences of a type.
// Event/task/etc. reminders are a completely separate pipeline and are
// never subject to any of these limits.
// ─────────────────────────────────────────────────────────────────────────────

export type NudgeType =
  | 'planning_calendar_empty'
  | 'planning_no_meals_tomorrow'
  | 'planning_no_kids_activity'
  | 'planning_no_selfcare'
  | 'upgrade_budget'
  | 'upgrade_nutrition'
  | 'upgrade_recap';

export interface NudgeTypeState {
  /** ISO timestamp of the last time this type was scheduled to fire. */
  lastShownAt?: string;
  /** ISO timestamp of the last time a notification of this type was tapped. */
  lastTappedAt?: string;
  /** How many times in a row this type fired without being tapped before its next eligible occurrence. Reset to 0 by a tap. */
  consecutiveIgnored: number;
  /** ISO timestamp — while set and in the future, this type is skipped entirely. */
  pausedUntil?: string;
}

export type NudgeStateMap = Partial<Record<NudgeType, NudgeTypeState>>;

const NUDGE_STATE_KEY = (uid: string) => `mm_nudge_state_${uid}`;
const SAME_TYPE_COOLDOWN_DAYS = 3;
const IGNORED_STREAK_LIMIT = 3;
const PAUSE_DURATION_DAYS = 14;
const UPGRADE_WEEKLY_COOLDOWN_DAYS = 7;
const TRIAL_GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

// ── localStorage persistence (impure — called from syncNotifications / the tap handler) ──

export function readNudgeState(uid: string): NudgeStateMap {
  try {
    return JSON.parse(localStorage.getItem(NUDGE_STATE_KEY(uid)) || '{}') as NudgeStateMap;
  } catch {
    return {};
  }
}

export function writeNudgeState(uid: string, state: NudgeStateMap): void {
  localStorage.setItem(NUDGE_STATE_KEY(uid), JSON.stringify(state));
}

/** Call when a nudge notification is tapped — resets its ignore streak and clears any pause, since the user just acted on it. */
export function markNudgeTapped(uid: string, type: NudgeType, now: Date = new Date()): void {
  const state = readNudgeState(uid);
  const prior = state[type] ?? { consecutiveIgnored: 0 };
  state[type] = { ...prior, lastTappedAt: now.toISOString(), consecutiveIgnored: 0, pausedUntil: undefined };
  writeNudgeState(uid, state);
}

// ── Date helpers (pure) ──

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateOnly(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDaysLocal(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Next occurrence of `hour:minute` today-or-later; rolls to tomorrow if that time today has already passed. */
function nextDailyTime(now: Date, hour: number, minute: number): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

/** Next occurrence of a given JS weekday (0=Sunday..6=Saturday) at `hour:minute`. */
function nextWeekday(now: Date, targetJsDay: number, hour: number, minute: number): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  let diff = (targetJsDay - now.getDay() + 7) % 7;
  if (diff === 0 && candidate <= now) diff = 7;
  candidate.setDate(candidate.getDate() + diff);
  return candidate;
}

// ── Condition detection (pure, individually unit-tested) ──

/** True when there's no calendar event and no incomplete task due in the next 7 days. */
export function isCalendarEmptyNext7Days(events: CalendarEvent[], tasks: Task[], now: Date): boolean {
  const from = startOfDay(now);
  const to = addDaysLocal(now, 7);
  const hasEvent = events.some((e) => {
    const d = parseDateOnly(e.date);
    return d >= from && d < to;
  });
  if (hasEvent) return false;
  const hasTask = tasks.some((t) => {
    if (t.completed || !t.due_date) return false;
    const d = parseDateOnly(t.due_date);
    return d >= from && d < to;
  });
  return !hasTask;
}

/** True when tomorrow has no breakfast/lunch/dinner planned. */
export function isNoMealsPlannedTomorrow(meals: DayMealPlan[], now: Date): boolean {
  const tomorrowKey = toDateKey(addDaysLocal(now, 1));
  const plan = meals.find((m) => m.date === tomorrowKey);
  if (!plan) return true;
  return !plan.breakfast?.name && !plan.lunch?.name && !plan.dinner?.name;
}

/** True when every kid has zero recurring weekly activities defined. False (nothing to nudge about) when there are no kids at all. */
export function isNoKidsActivityThisWeek(kids: Kid[], activitiesByKid: Record<string, Activity[]>): boolean {
  if (kids.length === 0) return false;
  return kids.every((kid) => (activitiesByKid[kid.id] ?? []).length === 0);
}

/** True when none of the given completed-dates fall within the last `days` days (inclusive of today). */
export function isNoSelfCareInLastNDays(completedDates: string[], now: Date, days: number): boolean {
  const cutoff = addDaysLocal(now, -days);
  const today = startOfDay(now);
  return !completedDates.some((d) => {
    const parsed = parseDateOnly(d);
    return parsed >= cutoff && parsed <= today;
  });
}

/**
 * Upgrade nudges target anyone without Pro access (Standard subscribers and
 * people still in their free trial — the trial grants Pro-level access, but
 * hasn't been paid for) — "never in the first 3 days of the trial" only
 * makes sense as a gate on trial users, so it's applied there specifically;
 * once someone converts to a paid Standard plan, no grace period applies.
 */
export function isUpgradeNudgeEligiblePlan(plan: SubscriptionPlan, isFreeTrial: boolean, trialStartDate: Date | null, now: Date): boolean {
  if (plan === 'pro_monthly' || plan === 'pro_yearly') return false;
  if (isFreeTrial) {
    if (!trialStartDate) return false;
    const daysSinceStart = (startOfDay(now).getTime() - startOfDay(trialStartDate).getTime()) / DAY_MS;
    return daysSinceStart >= TRIAL_GRACE_DAYS;
  }
  return plan === 'standard_monthly' || plan === 'standard_yearly';
}

// ── Data bundle + definitions ──

export interface NudgeDataBundle {
  events: CalendarEvent[];
  tasks: Task[];
  meals: DayMealPlan[];
  kids: Kid[];
  activitiesByKid: Record<string, Activity[]>;
  selfcareCompletedDates: string[];
  plan: SubscriptionPlan;
  isFreeTrial: boolean;
  trialStartDate: Date | null;
}

interface NudgeDefinition {
  type: NudgeType;
  condition: (data: NudgeDataBundle, now: Date) => boolean;
  nextOccurrence: (now: Date) => Date;
  route: string;
  bodyKey: string;
}

const PLANNING_DEFINITIONS: NudgeDefinition[] = [
  {
    type: 'planning_calendar_empty',
    condition: (d, now) => isCalendarEmptyNext7Days(d.events, d.tasks, now),
    nextOccurrence: (now) => nextWeekday(now, 0, 19, 0), // Sunday 19:00
    route: '/tasks',
    bodyKey: 'notifications.nudgePlanningCalendar',
  },
  {
    type: 'planning_no_meals_tomorrow',
    condition: (d, now) => isNoMealsPlannedTomorrow(d.meals, now),
    nextOccurrence: (now) => nextDailyTime(now, 17, 0),
    route: '/kitchen',
    bodyKey: 'notifications.nudgePlanningMeals',
  },
  {
    type: 'planning_no_kids_activity',
    condition: (d) => isNoKidsActivityThisWeek(d.kids, d.activitiesByKid),
    nextOccurrence: (now) => nextWeekday(now, 3, 16, 0), // Wednesday 16:00
    route: '/kids',
    bodyKey: 'notifications.nudgePlanningKids',
  },
  {
    type: 'planning_no_selfcare',
    condition: (d, now) => isNoSelfCareInLastNDays(d.selfcareCompletedDates, now, 3),
    nextOccurrence: (now) => nextDailyTime(now, 20, 0),
    route: '/selfcare',
    bodyKey: 'notifications.nudgePlanningSelfcare',
  },
];

// No clock time is specified in the product spec for upgrade nudges — noon
// is a reasonable, unobtrusive daily slot outside any default quiet hours.
const UPGRADE_DEFINITIONS: NudgeDefinition[] = [
  { type: 'upgrade_budget', condition: () => true, nextOccurrence: (now) => nextDailyTime(now, 12, 0), route: '/paywall', bodyKey: 'notifications.nudgeUpgradeBudget' },
  { type: 'upgrade_nutrition', condition: () => true, nextOccurrence: (now) => nextDailyTime(now, 12, 0), route: '/paywall', bodyKey: 'notifications.nudgeUpgradeNutrition' },
  { type: 'upgrade_recap', condition: () => true, nextOccurrence: (now) => nextDailyTime(now, 12, 0), route: '/paywall', bodyKey: 'notifications.nudgeUpgradeRecap' },
];

/** Priority used to break "max 1 nudge per day" ties — lower wins. Planning nudges (genuinely useful) always beat upgrade nudges (promotional). */
function priorityOf(type: NudgeType): number {
  const planningIndex = PLANNING_DEFINITIONS.findIndex((d) => d.type === type);
  if (planningIndex >= 0) return planningIndex;
  return PLANNING_DEFINITIONS.length;
}

// ── Main pure builder ──

/**
 * Evaluates every planning/upgrade nudge against current data + throttling
 * state and returns the (at most a handful of, max-1-per-calendar-day)
 * candidates to schedule, plus the updated state to persist. Pure — takes
 * the current nudge state in, returns the next one out, never touches
 * localStorage or the native plugin itself (syncNotifications does that).
 */
export function buildNudgeCandidates(
  settings: NotificationSettings,
  data: NudgeDataBundle,
  nudgeState: NudgeStateMap,
  now: Date
): { candidates: NotificationCandidate[]; nextState: NudgeStateMap } {
  type Eligible = { def: NudgeDefinition; at: Date };
  const eligible: Eligible[] = [];

  function currentState(type: NudgeType): NudgeTypeState | undefined {
    const s = nudgeState[type];
    if (!s) return undefined;
    // An expired pause no longer blocks evaluation — but still counts as a
    // clean slate (not implicitly "tapped"), so consecutiveIgnored is left
    // for the ignored-streak step below to resolve against lastTappedAt.
    if (s.pausedUntil && new Date(s.pausedUntil) <= now) return { ...s, pausedUntil: undefined };
    return s;
  }

  function evaluate(def: NudgeDefinition) {
    const state = currentState(def.type);
    if (state?.pausedUntil) return; // still paused
    if (state?.lastShownAt) {
      const daysSince = (now.getTime() - new Date(state.lastShownAt).getTime()) / DAY_MS;
      if (daysSince < SAME_TYPE_COOLDOWN_DAYS) return;
    }
    if (!def.condition(data, now)) return;
    const at = def.nextOccurrence(now);
    if (isTimeWithinQuietHours(`${pad2(at.getHours())}:${pad2(at.getMinutes())}`, settings.quietHours)) return;
    eligible.push({ def, at });
  }

  if (settings.planningNudges) {
    PLANNING_DEFINITIONS.forEach(evaluate);
  }
  if (settings.upgradeNudges && isUpgradeNudgeEligiblePlan(data.plan, data.isFreeTrial, data.trialStartDate, now)) {
    const weeklyEligible = UPGRADE_DEFINITIONS.every((d) => {
      const s = nudgeState[d.type];
      if (!s?.lastShownAt) return true;
      return (now.getTime() - new Date(s.lastShownAt).getTime()) / DAY_MS >= UPGRADE_WEEKLY_COOLDOWN_DAYS;
    });
    if (weeklyEligible) {
      // Rotate through the 3 messages — pick whichever was shown least recently (or never).
      const sorted = [...UPGRADE_DEFINITIONS].sort((a, b) => {
        const aT = nudgeState[a.type]?.lastShownAt ? new Date(nudgeState[a.type]!.lastShownAt!).getTime() : 0;
        const bT = nudgeState[b.type]?.lastShownAt ? new Date(nudgeState[b.type]!.lastShownAt!).getTime() : 0;
        return aT - bT;
      });
      evaluate(sorted[0]);
    }
  }

  // Max 1 nudge per day total — keep only the highest-priority candidate per calendar date.
  const byDate = new Map<string, Eligible>();
  for (const c of eligible) {
    const key = toDateKey(c.at);
    const existing = byDate.get(key);
    if (!existing || priorityOf(c.def.type) < priorityOf(existing.def.type)) byDate.set(key, c);
  }

  const nextState: NudgeStateMap = { ...nudgeState };
  const scheduled: Eligible[] = [];

  for (const c of byDate.values()) {
    const prior = currentState(c.def.type);
    let consecutiveIgnored = prior?.consecutiveIgnored ?? 0;

    // The previous instance of this type (if any) already fired by now —
    // check whether it was ever tapped before counting it as ignored.
    if (prior?.lastShownAt && new Date(prior.lastShownAt) <= now) {
      const tapped = !!prior.lastTappedAt && new Date(prior.lastTappedAt) >= new Date(prior.lastShownAt);
      consecutiveIgnored = tapped ? 0 : consecutiveIgnored + 1;
    }

    if (consecutiveIgnored >= IGNORED_STREAK_LIMIT) {
      nextState[c.def.type] = {
        ...prior,
        consecutiveIgnored: 0,
        pausedUntil: new Date(now.getTime() + PAUSE_DURATION_DAYS * DAY_MS).toISOString(),
      };
      continue; // paused just now — not scheduled this round
    }

    nextState[c.def.type] = { ...prior, lastShownAt: c.at.toISOString(), consecutiveIgnored, pausedUntil: undefined };
    scheduled.push(c);
  }

  const candidates: NotificationCandidate[] = scheduled.map((c) => ({
    key: `nudge:${c.def.type}`,
    type: 'nudge',
    title: i18n.t('notifications.nudgeTitle'),
    body: i18n.t(c.def.bodyKey),
    route: c.def.route,
    itemId: c.def.type,
    at: c.at,
    isDaily: false,
  }));

  return { candidates, nextState };
}
