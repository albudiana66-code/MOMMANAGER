// Supabase Edge Function — hourly cron. Sends due trial-sequence emails
// (day 0/1/3/5/6) and the one-off "we miss you" (7 days after expiry).
//
// Replaces the old trial-reminder function, which only handled the no-card
// free trial and ran once daily — this covers RevenueCat trials too and
// runs hourly so quiet-hours postponement (see below) actually lands at
// 09:00 rather than being a whole day late.
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy email-scheduler --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Schedule (pg_cron, hourly) ────────────────────────────────────────────────
// select cron.unschedule('trial-reminder'); -- old daily job, superseded by this
// select cron.schedule('email-scheduler', '0 * * * *', $$
//   select net.http_post(
//     url := 'https://giprbmoteojghxzodpcw.supabase.co/functions/v1/email-scheduler',
//     headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb
//   )
// $$);

import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import {
  dueTrialEmails,
  isUkQuietHours,
  isWeMissYouDue,
  trialEmailKey,
  weMissYouEmailKey,
  type TrialSequenceDay,
} from '../_shared/lifecycleLogic.ts';
import {
  periodFromProductId,
  trialDay0Email,
  trialDay1Email,
  trialDay3Email,
  trialDay5Email,
  trialDay6Email,
  weMissYouEmail,
  type TemplateResult,
} from '../_shared/emailTemplates.ts';
import { sendViaResend } from '../_shared/resend.ts';
import { ensureEmailPreferences } from '../_shared/emailPreferences.ts';

function trialTemplate(day: TrialSequenceDay, name: string | null, unsubscribeToken: string, row: {
  price_string: string | null; product_id: string | null; store: string | null;
}): TemplateResult {
  switch (day) {
    case 0: return trialDay0Email(name, unsubscribeToken);
    case 1: return trialDay1Email(name, unsubscribeToken);
    case 3: return trialDay3Email(name, unsubscribeToken);
    case 5: return trialDay5Email(name, unsubscribeToken);
    case 6: return trialDay6Email(name, {
      priceString: row.price_string,
      period: periodFromProductId(row.product_id),
      store: row.store,
    });
  }
}

Deno.serve(async (_req) => {
  const now = new Date();

  // Quiet hours (21:00–08:00 Europe/London): send nothing this run. Since
  // this runs hourly, the 09:00 run is simply the next one after the quiet
  // window — that IS the "postpone to 09:00" behaviour, with no extra
  // bookkeeping needed.
  if (isUkQuietHours(now)) {
    return new Response(JSON.stringify({ skipped: 'quiet_hours' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createAdminClient();
  let sentCount = 0;

  // ── Trial sequence (day 0/1/3/5/6) ─────────────────────────────────────────
  const { data: trialingUsers } = await supabase
    .from('subscription_status')
    .select('user_id, trial_started_at, price_string, product_id, store')
    .eq('status', 'trialing')
    .not('trial_started_at', 'is', null);

  for (const row of trialingUsers ?? []) {
    const daysElapsed = Math.floor((now.getTime() - new Date(row.trial_started_at).getTime()) / 86_400_000);

    const { data: sentRows } = await supabase
      .from('email_log')
      .select('email_key')
      .eq('user_id', row.user_id)
      .like('email_key', 'trial_day%');
    const due = dueTrialEmails('trialing', daysElapsed, (sentRows ?? []).map((r) => r.email_key));
    if (due.length === 0) continue;

    // Re-check live status right before sending — everything up to this
    // point was computed from a query that could be stale by now.
    const { data: fresh } = await supabase.from('subscription_status').select('status').eq('user_id', row.user_id).single();
    if (fresh?.status !== 'trialing') continue;

    const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', row.user_id).single();
    if (!profile?.email) continue;

    const { unsubscribe_token } = await ensureEmailPreferences(supabase, row.user_id);

    for (const day of due) {
      const key = trialEmailKey(day);
      const { error: logError } = await supabase.from('email_log').insert({ user_id: row.user_id, email_key: key });
      if (logError) continue; // already sent (e.g. two overlapping runs) — never double-send

      const template = trialTemplate(day, profile.name, unsubscribe_token, row);
      try {
        await sendViaResend({ to: profile.email, subject: template.subject, html: template.html, text: template.text });
        sentCount++;
      } catch (err) {
        console.error(`email-scheduler: failed to send ${key} to ${row.user_id}:`, err);
      }
    }
  }

  // ── "We miss you" — once, 7 days after expiry, only if opted in ──────────
  const { data: expiredUsers } = await supabase
    .from('subscription_status')
    .select('user_id, current_period_ends_at')
    .eq('status', 'expired')
    .not('current_period_ends_at', 'is', null);

  for (const row of expiredUsers ?? []) {
    const expiredAt = new Date(row.current_period_ends_at);
    const key = weMissYouEmailKey(expiredAt);

    const { data: alreadySentRow } = await supabase
      .from('email_log').select('id').eq('user_id', row.user_id).eq('email_key', key).maybeSingle();
    const { marketing_opt_in, unsubscribe_token } = await ensureEmailPreferences(supabase, row.user_id);

    if (!isWeMissYouDue('expired', now, expiredAt, !!alreadySentRow, marketing_opt_in)) continue;

    const { data: fresh } = await supabase.from('subscription_status').select('status').eq('user_id', row.user_id).single();
    if (fresh?.status !== 'expired') continue;

    const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', row.user_id).single();
    if (!profile?.email) continue;

    const { error: logError } = await supabase.from('email_log').insert({ user_id: row.user_id, email_key: key });
    if (logError) continue;

    const template = weMissYouEmail(profile.name, unsubscribe_token);
    try {
      await sendViaResend({ to: profile.email, subject: template.subject, html: template.html, text: template.text });
      sentCount++;
    } catch (err) {
      console.error(`email-scheduler: failed to send we_miss_you to ${row.user_id}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent: sentCount }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
