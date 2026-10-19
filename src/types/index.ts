export type SubscriptionPlan =
  | 'free_trial'
  | 'standard_monthly'
  | 'standard_yearly'
  | 'pro_monthly'
  | 'pro_yearly'
  | null;

export type BillingPeriod = 'monthly' | 'yearly';

/** Per-user reminder-notification preferences, stored as profiles.notification_settings (jsonb). */
export interface NotificationSettings {
  /** Master switch — off means no category ever fires, regardless of its own toggle. */
  enabled: boolean;
  categories: {
    /** Calendar events. */
    calendar: boolean;
    /** To-do tasks. */
    tasks: boolean;
    kids: boolean;
    /** Meal-plan reminders (per-meal, falling back to the daily "tonight's dinner" reminder) + the daily shopping-list reminder. */
    meals: boolean;
    selfcare: boolean;
  };
  /** Default reminder offset (minutes before) applied to new/pre-existing calendar, kids, and activity items that haven't chosen their own. Meal and self-care reminders default to None instead — they're opted into per-item, not inherited from this. */
  defaultReminderMinutes: 0 | 10 | 30 | 60 | 1440;
  /** "HH:mm" 24h time the daily meal reminder fires (fallback when a meal has no clock time of its own) and every self-care routine's reminder fires at. */
  kitchenReminderTime: string;
  /** "HH:mm" 24h time the daily self-care reminder fires. */
  selfcareReminderTime: string;
  quietHours: {
    enabled: boolean;
    /** "HH:mm" 24h. */
    start: string;
    /** "HH:mm" 24h. */
    end: string;
  };
  /** "Smart" data-driven planning nudges (empty calendar, no meal planned, etc.) — distinct from the fixed per-item reminders above, which are never subject to the nudge throttling rules (max 1/day, 3-day same-type cooldown, pause after 3 ignored). On by default. */
  planningNudges: boolean;
  /** Promotional nudges toward Pro, shown to Standard/trial users only. Off by default — only ever turned on by the user's explicit "Yes" in the opt-in prompt shown the first time notification permission is granted (or by flipping it on later in Settings). */
  upgradeNudges: boolean;
  /** Whether the upgrade-nudge opt-in prompt has already been shown once — gates it from reappearing on every permission grant. */
  upgradeNudgesAsked: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  categories: {
    calendar: true,
    tasks: true,
    kids: true,
    meals: true,
    selfcare: true,
  },
  defaultReminderMinutes: 10,
  kitchenReminderTime: '16:00',
  selfcareReminderTime: '20:30',
  quietHours: {
    enabled: true,
    start: '21:30',
    end: '07:00',
  },
  planningNudges: true,
  upgradeNudges: false,
  upgradeNudgesAsked: false,
};

/**
 * Coerces whatever is actually stored in profiles.notification_settings into
 * the current shape — handles both a brand-new user (nothing saved yet) and
 * a pre-existing saved settings object from before `categories.tasks`/
 * `categories.meals` existed (back when tasks were bundled under `calendar`
 * and meals were split into separate `kitchen`/`shopping` toggles).
 */
export function normalizeNotificationSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
  const legacyCategories = raw.categories as Partial<NotificationSettings['categories']> & { kitchen?: boolean; shopping?: boolean } | undefined;
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...raw,
    categories: {
      calendar: legacyCategories?.calendar ?? DEFAULT_NOTIFICATION_SETTINGS.categories.calendar,
      tasks: legacyCategories?.tasks ?? legacyCategories?.calendar ?? DEFAULT_NOTIFICATION_SETTINGS.categories.tasks,
      kids: legacyCategories?.kids ?? DEFAULT_NOTIFICATION_SETTINGS.categories.kids,
      meals: legacyCategories?.meals ?? (legacyCategories?.kitchen || legacyCategories?.shopping) ?? DEFAULT_NOTIFICATION_SETTINGS.categories.meals,
      selfcare: legacyCategories?.selfcare ?? DEFAULT_NOTIFICATION_SETTINGS.categories.selfcare,
    },
  };
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  language: string;
  currency: string;
  theme: 'dark' | 'light';
  subscription_status: SubscriptionPlan;
  subscription_expires_at?: string;
  trial_start?: string;
  trial_end?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_end_date?: string;
  created_at: string;
  ai_consent: boolean;
  notification_settings?: NotificationSettings;
}

/**
 * Minutes before an item's date/time that its reminder notification fires.
 * `0` means "at the exact time". `null` means the user explicitly turned
 * the reminder off. `undefined` (the field absent) means no choice has
 * been made yet — syncNotifications() falls back to the user's configured
 * default for new items, which is how pre-existing items (saved before
 * this field existed) end up with a sensible reminder instead of none.
 */
export type ReminderMinutes = 0 | 10 | 30 | 60 | 1440 | null;

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  category: 'work' | 'personal' | 'kids' | 'medical' | 'other';
  priority: 'high' | 'medium' | 'low';
  plan?: 'mom' | 'kids' | 'family';
  time?: string;
  /** @deprecated Superseded by reminder_minutes_before (0 = equivalent to has_reminder: true). Still read for tasks saved before that field existed. */
  has_reminder?: boolean;
  reminder_minutes_before?: ReminderMinutes;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time?: string;
  allDay?: boolean;
  plan?: 'mom' | 'kids' | 'family';
  category?: string;
  color?: string;
  reminder_minutes_before?: ReminderMinutes;
  created_at: string;
}

export interface Kid {
  id: string;
  user_id: string;
  name: string;
  birthdate: string;
  avatar?: string;
  notes?: string;
  created_at: string;
}

export interface KidMilestone {
  id: string;
  kid_id: string;
  title: string;
  date: string;
  /** Optional — milestones saved before this field existed have no time, so they're treated as all-day and never get a timed reminder. */
  time?: string;
  category: 'health' | 'school' | 'activity' | 'firstTime';
  notes?: string;
  reminder_minutes_before?: ReminderMinutes;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  list_name: string;
  created_at: string;
}

export interface BudgetTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: 'food' | 'groceries' | 'housing' | 'transport' | 'eating_out' | 'shopping' | 'kids' | 'health' | 'entertainment' | 'savings' | 'other';
  account_id?: string;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  created_at: string;
}

export interface SelfCareEntry {
  id: string;
  user_id: string;
  type: 'mood' | 'water' | 'sleep' | 'journal';
  value?: number;
  notes?: string;
  date: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type Currency = 'GBP' | 'RON' | 'EUR' | 'USD' | 'PLN';
export type Language = 'en' | 'ro' | 'ru' | 'uk' | 'fr' | 'de' | 'ar' | 'it' | 'pl';

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}
