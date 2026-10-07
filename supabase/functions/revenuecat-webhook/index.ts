// Supabase Edge Function — receives RevenueCat webhook events.
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy revenuecat-webhook --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Secrets ───────────────────────────────────────────────────────────────────
// npx supabase secrets set REVENUECAT_WEBHOOK_SECRET='Bearer <a long random string>' --project-ref giprbmoteojghxzodpcw
// (RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY are already set for other functions.)
//
// ── RevenueCat dashboard ──────────────────────────────────────────────────────
// Project settings → Integrations → Webhooks → Add:
//   URL: https://giprbmoteojghxzodpcw.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: the exact same value as REVENUECAT_WEBHOOK_SECRET above
//
// This only works for events whose app_user_id is a real Supabase user id —
// see identifyRevenueCatUser() in src/lib/iap.ts, called via Purchases.logIn()
// once the user signs in.

import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { decideStatusTransition, eventEmailKey, type SubscriptionStatus } from '../_shared/lifecycleLogic.ts';
import { billingIssueEmail, cancellationEmail, formatPrice, subscribedEmail, type TemplateResult } from '../_shared/emailTemplates.ts';
import { sendViaResend } from '../_shared/resend.ts';
import { ensureEmailPreferences } from '../_shared/emailPreferences.ts';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  period_type?: string;
  store?: string;
  environment?: string;
  event_timestamp_ms?: number;
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  price?: number;
  currency?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = req.headers.get('Authorization') ?? '';
  if (!WEBHOOK_SECRET || auth !== WEBHOOK_SECRET) {
    console.error('revenuecat-webhook: rejected — Authorization header mismatch');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { event?: RevenueCatEvent };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const event = body.event;
  if (!event?.id || !event.type || !event.app_user_id) {
    return new Response(JSON.stringify({ error: 'Missing event.id / event.type / event.app_user_id' }), { status: 400 });
  }

  const supabase = createAdminClient();
  const environment = event.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
  const eventAt = new Date(event.event_timestamp_ms ?? event.purchased_at_ms ?? Date.now());

  // app_user_id should be the Supabase user id (see identifyRevenueCatUser).
  // Falls back to null (still logged, just unresolved) for any event from
  // before that was wired up, or a genuinely anonymous install.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('id', event.app_user_id)
    .maybeSingle();
  const userId: string | null = profile?.id ?? null;

  // ── Idempotency: the unique constraint on revenuecat_event_id is the
  // actual guard. A unique-violation here means RevenueCat redelivered an
  // event we've already fully processed — ack with 200 so it stops retrying,
  // but do nothing else (no double status update, no double email).
  const { error: insertError } = await supabase.from('subscription_events').insert({
    revenuecat_event_id: event.id,
    app_user_id: event.app_user_id,
    user_id: userId,
    event_type: event.type,
    period_type: event.period_type ?? null,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    environment,
    event_at: eventAt.toISOString(),
    raw: event,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      console.log('revenuecat-webhook: duplicate event, already processed:', event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    console.error('revenuecat-webhook: failed to log event:', insertError.message);
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  if (!userId) {
    console.warn('revenuecat-webhook: app_user_id did not match any profile, status not updated:', event.app_user_id);
    return new Response(JSON.stringify({ received: true, matchedUser: false }), { status: 200 });
  }

  const { data: existing } = await supabase
    .from('subscription_status')
    .select('status, trial_started_at, price_string, currency, current_period_ends_at')
    .eq('user_id', userId)
    .maybeSingle();
  const previousStatus = (existing?.status as SubscriptionStatus | undefined) ?? null;

  const decision = decideStatusTransition(event.type, event.period_type, previousStatus);

  if (decision.newStatus) {
    const priceString = formatPrice(event.price, event.currency);
    await supabase.from('subscription_status').upsert({
      user_id: userId,
      status: decision.newStatus,
      product_id: event.product_id ?? null,
      store: event.store ?? null,
      period_type: event.period_type ?? null,
      // Never overwrite a known real price with a $0 trial-period price.
      price_string: priceString ?? existing?.price_string ?? null,
      currency: priceString ? event.currency : existing?.currency ?? null,
      trial_started_at: decision.startsTrial ? eventAt.toISOString() : existing?.trial_started_at ?? null,
      current_period_ends_at: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : existing?.current_period_ends_at ?? null,
      will_renew: event.type !== 'CANCELLATION',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  // SANDBOX events update status (so testing in the RevenueCat dashboard /
  // TestFlight is visible) but never send real email.
  if (decision.email && environment !== 'SANDBOX' && profile?.email) {
    try {
      const emailKey = eventEmailKey(decision.email.kind, event.id);
      let template: TemplateResult;
      if (decision.email.kind === 'subscribed') {
        template = subscribedEmail(profile.name);
      } else if (decision.email.kind === 'cancellation') {
        const expiryDateStr = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'the end of your current billing period';
        const { unsubscribe_token } = await ensureEmailPreferences(supabase, userId);
        template = cancellationEmail(profile.name, {
          expiryDateStr,
          unsubscribeToken: unsubscribe_token,
          feedbackUrl: 'mailto:support@mommanager.co.uk?subject=What%20could%20we%20do%20better%3F',
        });
      } else {
        template = billingIssueEmail(profile.name, event.store ?? null);
      }

      const { error: logError } = await supabase
        .from('email_log')
        .insert({ user_id: userId, email_key: emailKey });

      // If the key's already there, another delivery of this same event beat
      // us to it (shouldn't happen given the idempotency check above, but
      // email_log's own unique constraint is the last line of defence) —
      // skip sending rather than double-email.
      if (!logError) {
        await sendViaResend({ to: profile.email, subject: template.subject, html: template.html, text: template.text });
      }
    } catch (err) {
      console.error('revenuecat-webhook: email send failed:', err);
      // Non-fatal — the event is already durably logged and the status
      // already updated; we don't want RevenueCat retrying the whole event
      // just because Resend had a bad moment.
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
