import { describe, expect, it } from 'vitest';
import {
  decideStatusTransition,
  dueTrialEmails,
  eventEmailKey,
  isUkQuietHours,
  isWeMissYouDue,
  localTimeInZone,
  trialEmailKey,
  weMissYouEmailKey,
} from './lifecycleLogic';

// ── Idempotency ──────────────────────────────────────────────────────────────
// The actual guard is the DB unique constraint on subscription_events.revenuecat_event_id
// and email_log.(user_id, email_key) — verified live against the schema. What's
// unit-testable here is that the logic feeding those constraints is deterministic:
// the same event always produces the same decision and the same email key, so a
// redelivered webhook can never slip through as "different".

describe('idempotency — deterministic decisions and keys', () => {
  it('decideStatusTransition is pure: identical input always gives identical output', () => {
    const a = decideStatusTransition('CANCELLATION', 'NORMAL', 'active');
    const b = decideStatusTransition('CANCELLATION', 'NORMAL', 'active');
    expect(a).toEqual(b);
  });

  it('eventEmailKey is stable for the same event id, and distinct across event ids', () => {
    expect(eventEmailKey('subscribed', 'evt_123')).toBe(eventEmailKey('subscribed', 'evt_123'));
    expect(eventEmailKey('subscribed', 'evt_123')).not.toBe(eventEmailKey('subscribed', 'evt_456'));
  });

  it('trialEmailKey is stable per day and distinct across days', () => {
    expect(trialEmailKey(0)).toBe('trial_day0');
    expect(trialEmailKey(6)).toBe('trial_day6');
    expect(trialEmailKey(0)).not.toBe(trialEmailKey(1));
  });

  it('weMissYouEmailKey is stable for the same expiry instant', () => {
    const t = new Date('2026-10-01T00:00:00.000Z');
    expect(weMissYouEmailKey(t)).toBe(weMissYouEmailKey(new Date(t.getTime())));
  });
});

// ── Status transitions ──────────────────────────────────────────────────────

describe('decideStatusTransition', () => {
  it('a trial INITIAL_PURCHASE starts trialing and sends no email (day 0 comes from the scheduler)', () => {
    const d = decideStatusTransition('INITIAL_PURCHASE', 'TRIAL', null);
    expect(d).toEqual({ newStatus: 'trialing', email: null, startsTrial: true });
  });

  it('a direct (non-trial) INITIAL_PURCHASE goes active and sends the subscribed email', () => {
    const d = decideStatusTransition('INITIAL_PURCHASE', 'NORMAL', null);
    expect(d.newStatus).toBe('active');
    expect(d.email).toEqual({ kind: 'subscribed' });
  });

  it('a RENEWAL while previously trialing is a trial conversion — sends subscribed', () => {
    const d = decideStatusTransition('RENEWAL', 'NORMAL', 'trialing');
    expect(d.newStatus).toBe('active');
    expect(d.email).toEqual({ kind: 'subscribed' });
  });

  it('an ordinary RENEWAL (already active) sends no email', () => {
    const d = decideStatusTransition('RENEWAL', 'NORMAL', 'active');
    expect(d.newStatus).toBe('active');
    expect(d.email).toBeNull();
  });

  it('CANCELLATION sends the cancellation email', () => {
    const d = decideStatusTransition('CANCELLATION', 'NORMAL', 'active');
    expect(d.newStatus).toBe('cancelled_pending');
    expect(d.email).toEqual({ kind: 'cancellation' });
  });

  it('UNCANCELLATION goes active with no email (no nagging)', () => {
    const d = decideStatusTransition('UNCANCELLATION', 'NORMAL', 'cancelled_pending');
    expect(d).toEqual({ newStatus: 'active', email: null, startsTrial: false });
  });

  it('EXPIRATION sends no immediate email — "we miss you" is the scheduler’s job', () => {
    const d = decideStatusTransition('EXPIRATION', 'NORMAL', 'cancelled_pending');
    expect(d.newStatus).toBe('expired');
    expect(d.email).toBeNull();
  });

  it('BILLING_ISSUE sends the billing issue email', () => {
    const d = decideStatusTransition('BILLING_ISSUE', 'NORMAL', 'active');
    expect(d.newStatus).toBe('billing_issue');
    expect(d.email).toEqual({ kind: 'billing_issue' });
  });

  it('PRODUCT_CHANGE keeps the previous status and sends no email', () => {
    const d = decideStatusTransition('PRODUCT_CHANGE', 'NORMAL', 'active');
    expect(d).toEqual({ newStatus: 'active', email: null, startsTrial: false });
  });

  it('an unrecognised event type changes nothing', () => {
    const d = decideStatusTransition('SOMETHING_NEW', null, 'active');
    expect(d).toEqual({ newStatus: null, email: null, startsTrial: false });
  });
});

// ── Trial sequence stops on cancel/convert/expire ───────────────────────────

describe('dueTrialEmails — sequence stops the instant status changes', () => {
  it('sends day 0 as soon as the trial starts', () => {
    expect(dueTrialEmails('trialing', 0, [])).toEqual([0]);
  });

  it('sends every day whose threshold has passed and isn’t logged yet', () => {
    expect(dueTrialEmails('trialing', 6, [])).toEqual([0, 1, 3, 5, 6]);
  });

  it('skips days already in email_log', () => {
    expect(dueTrialEmails('trialing', 6, ['trial_day0', 'trial_day1'])).toEqual([3, 5, 6]);
  });

  it('never sends a day whose threshold hasn’t passed yet', () => {
    expect(dueTrialEmails('trialing', 2, [])).toEqual([0, 1]);
  });

  it('stops completely the moment the user converts to active', () => {
    expect(dueTrialEmails('active', 6, [])).toEqual([]);
  });

  it('stops completely the moment the user cancels', () => {
    expect(dueTrialEmails('cancelled_pending', 6, [])).toEqual([]);
  });

  it('stops completely once expired', () => {
    expect(dueTrialEmails('expired', 6, [])).toEqual([]);
  });
});

// ── UK quiet hours (21:00–08:00 Europe/London, DST-aware) ──────────────────

describe('isUkQuietHours', () => {
  it('flags late evening and early morning as quiet, in UK winter time (GMT, UTC+0)', () => {
    expect(isUkQuietHours(new Date('2026-01-15T21:00:00Z'))).toBe(true); // 21:00 GMT
    expect(isUkQuietHours(new Date('2026-01-15T23:30:00Z'))).toBe(true);
    expect(isUkQuietHours(new Date('2026-01-15T03:00:00Z'))).toBe(true);
    expect(isUkQuietHours(new Date('2026-01-15T07:59:00Z'))).toBe(true);
  });

  it('does not flag daytime/evening-before-cutoff, in UK winter time', () => {
    expect(isUkQuietHours(new Date('2026-01-15T08:00:00Z'))).toBe(false); // exactly 08:00
    expect(isUkQuietHours(new Date('2026-01-15T12:00:00Z'))).toBe(false);
    expect(isUkQuietHours(new Date('2026-01-15T20:59:00Z'))).toBe(false);
  });

  it('accounts for British Summer Time (UTC+1) — 21:00 BST is 20:00 UTC', () => {
    // 15 July 2026 is within BST.
    expect(isUkQuietHours(new Date('2026-07-15T20:00:00Z'))).toBe(true); // 21:00 BST
    expect(isUkQuietHours(new Date('2026-07-15T19:59:00Z'))).toBe(false); // 20:59 BST
    expect(isUkQuietHours(new Date('2026-07-15T06:59:00Z'))).toBe(true); // 07:59 BST
    expect(isUkQuietHours(new Date('2026-07-15T07:00:00Z'))).toBe(false); // 08:00 BST
  });

  it('localTimeInZone matches the hour used by isUkQuietHours', () => {
    const d = new Date('2026-07-15T20:00:00Z');
    expect(localTimeInZone(d, 'Europe/London').hour).toBe(21);
  });
});

// ── "We miss you" — unsubscribe/opt-out respected ───────────────────────────

describe('isWeMissYouDue', () => {
  const expiredAt = new Date('2026-09-01T00:00:00Z');
  const sevenDaysLater = new Date('2026-09-08T00:00:00Z');
  const sixDaysLater = new Date('2026-09-07T00:00:00Z');

  it('is due exactly 7 days after expiry, for an expired + opted-in user', () => {
    expect(isWeMissYouDue('expired', sevenDaysLater, expiredAt, false, true)).toBe(true);
  });

  it('is not due before 7 days have passed', () => {
    expect(isWeMissYouDue('expired', sixDaysLater, expiredAt, false, true)).toBe(false);
  });

  it('respects unsubscribe — never sent if marketing_opt_in is false', () => {
    expect(isWeMissYouDue('expired', sevenDaysLater, expiredAt, false, false)).toBe(false);
  });

  it('never sent twice — already-sent flag blocks it', () => {
    expect(isWeMissYouDue('expired', sevenDaysLater, expiredAt, true, true)).toBe(false);
  });

  it('never sent if the user resubscribed (status no longer expired)', () => {
    expect(isWeMissYouDue('active', sevenDaysLater, expiredAt, false, true)).toBe(false);
  });

  it('never sent with no known expiry date', () => {
    expect(isWeMissYouDue('expired', sevenDaysLater, null, false, true)).toBe(false);
  });
});
