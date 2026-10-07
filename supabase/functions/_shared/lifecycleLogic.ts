// Pure, dependency-free decision logic for the RevenueCat lifecycle email
// system. No Deno-specific or npm: imports on purpose — this file is loaded
// both by the Deno edge functions (revenuecat-webhook, email-scheduler) and
// directly by the frontend's vitest suite (src/lib/*.test.ts), so the
// hardest-to-get-right rules (status transitions, idempotency, quiet hours,
// which trial email is due) are tested without touching the network or a
// database.

export type SubscriptionStatus = 'trialing' | 'active' | 'cancelled_pending' | 'expired' | 'billing_issue';

export type EmailToSend =
  | null
  | { kind: 'subscribed' }
  | { kind: 'cancellation' }
  | { kind: 'billing_issue' };

export interface StatusDecision {
  newStatus: SubscriptionStatus | null; // null = no status change (unrecognised event type)
  email: EmailToSend;
  /** Set trial_started_at on this transition (first TRIAL purchase only). */
  startsTrial: boolean;
}

/**
 * Maps a RevenueCat event to the new subscription_status and, if any, the
 * event-driven email to send synchronously. The trial-sequence emails
 * (day 0/1/3/5/6) are NOT decided here — they're computed by the hourly
 * scheduler from trial_started_at, not fired from the webhook.
 *
 * `previousStatus` is the status we had on file for this user *before*
 * this event — e.g. a RENEWAL event only means "trial converted to paid"
 * (→ send the Subscribed email) if the user was previously trialing.
 */
export function decideStatusTransition(
  eventType: string,
  periodType: string | null | undefined,
  previousStatus: SubscriptionStatus | null
): StatusDecision {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
      if (periodType === 'TRIAL') {
        return { newStatus: 'trialing', email: null, startsTrial: true };
      }
      return { newStatus: 'active', email: { kind: 'subscribed' }, startsTrial: false };

    case 'RENEWAL':
      if (previousStatus === 'trialing') {
        return { newStatus: 'active', email: { kind: 'subscribed' }, startsTrial: false };
      }
      return { newStatus: 'active', email: null, startsTrial: false };

    case 'CANCELLATION':
      return { newStatus: 'cancelled_pending', email: { kind: 'cancellation' }, startsTrial: false };

    case 'UNCANCELLATION':
      return { newStatus: 'active', email: null, startsTrial: false };

    case 'EXPIRATION':
      // "We miss you" fires 7 days later from the scheduler, not here.
      return { newStatus: 'expired', email: null, startsTrial: false };

    case 'BILLING_ISSUE':
      return { newStatus: 'billing_issue', email: { kind: 'billing_issue' }, startsTrial: false };

    case 'PRODUCT_CHANGE':
      // Keep whatever status was already on file — only product/store/period metadata changes.
      return { newStatus: previousStatus, email: null, startsTrial: false };

    default:
      return { newStatus: null, email: null, startsTrial: false };
  }
}

// ── UK quiet hours (Europe/London, 21:00–08:00) ─────────────────────────────

/** Local HH:mm in a given IANA timezone, DST-aware, without needing a date library. */
export function localTimeInZone(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

/** True from 21:00 up to (not including) 08:00, UK local time. */
export function isUkQuietHours(date: Date): boolean {
  const { hour } = localTimeInZone(date, 'Europe/London');
  return hour >= 21 || hour < 8;
}

// ── Trial sequence due-check ─────────────────────────────────────────────────

export const TRIAL_SEQUENCE_DAYS = [0, 1, 3, 5, 6] as const;
export type TrialSequenceDay = typeof TRIAL_SEQUENCE_DAYS[number];

export function trialEmailKey(day: TrialSequenceDay): string {
  return `trial_day${day}`;
}

/**
 * Which trial-sequence emails are due right now, given how many whole days
 * have elapsed since the trial started and which keys are already in
 * email_log. Only ever returns emails for a user whose CURRENT status is
 * still 'trialing' — callers must re-check that live before calling this,
 * since cancelling/converting/expiring must stop the sequence immediately.
 */
export function dueTrialEmails(
  status: SubscriptionStatus,
  daysElapsed: number,
  alreadySentKeys: readonly string[]
): TrialSequenceDay[] {
  if (status !== 'trialing') return [];
  const sent = new Set(alreadySentKeys);
  return TRIAL_SEQUENCE_DAYS.filter((day) => daysElapsed >= day && !sent.has(trialEmailKey(day)));
}

/** "We miss you" — exactly once, only starting 7 days after expiry, only if they're still marked expired (re-subscribing cancels this) and opted in to marketing emails. */
export function isWeMissYouDue(
  status: SubscriptionStatus,
  now: Date,
  expiredAt: Date | null,
  alreadySent: boolean,
  marketingOptIn: boolean
): boolean {
  if (status !== 'expired' || !expiredAt || alreadySent || !marketingOptIn) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() >= expiredAt.getTime() + sevenDaysMs;
}

export function weMissYouEmailKey(expiredAt: Date): string {
  return `we_miss_you:${expiredAt.toISOString()}`;
}

export function eventEmailKey(kind: 'subscribed' | 'cancellation' | 'billing_issue', revenuecatEventId: string): string {
  return `${kind}:${revenuecatEventId}`;
}
