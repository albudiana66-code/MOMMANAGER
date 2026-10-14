// Supabase Edge Function — DEV ONLY. Sends every lifecycle email template
// to one address so you can check how they actually look, without waiting
// for real trial/subscription events.
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy send-email-preview --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Secrets ───────────────────────────────────────────────────────────────────
// npx supabase secrets set DEV_PREVIEW_SECRET='<a long random string>' --project-ref giprbmoteojghxzodpcw
//
// ── Usage ──────────────────────────────────────────────────────────────────
// curl -X POST https://giprbmoteojghxzodpcw.supabase.co/functions/v1/send-email-preview \
//   -H "Authorization: Bearer <DEV_PREVIEW_SECRET>" \
//   -H "Content-Type: application/json" \
//   -d '{"to":"diana@example.com"}'
//
// Pass {"to":"...","only":"welcome"} to send a single named template instead
// of all 9 — see the `key` field in previewSet() below for valid values.
//
// Not linked from anywhere in the app UI on purpose — curl/Postman only.
// Every subject is prefixed "[PREVIEW]" and dummy unsubscribe tokens are
// used, so nothing here touches real user data or real unsubscribe links.

import {
  billingIssueEmail,
  cancellationEmail,
  subscribedEmail,
  trialDay0Email,
  trialDay1Email,
  trialDay3Email,
  trialDay5Email,
  trialDay6Email,
  weMissYouEmail,
  type TemplateResult,
} from '../_shared/emailTemplates.ts';
import { sendViaResend } from '../_shared/resend.ts';

const DEV_PREVIEW_SECRET = Deno.env.get('DEV_PREVIEW_SECRET') ?? '';
const DUMMY_UNSUBSCRIBE_TOKEN = '00000000-0000-0000-0000-000000000000';
const DUMMY_NAME = 'Diana';

function previewSet(): { key: string; template: TemplateResult }[] {
  return [
    { key: 'welcome', template: trialDay0Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN) },
    { key: 'day1', template: trialDay1Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN) },
    { key: 'day3', template: trialDay3Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN) },
    { key: 'day5', template: trialDay5Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN) },
    { key: 'day6', template: trialDay6Email(DUMMY_NAME, { priceString: '£7.99', period: 'month', store: 'APP_STORE' }) },
    { key: 'subscribed', template: subscribedEmail(DUMMY_NAME) },
    { key: 'cancellation', template: cancellationEmail(DUMMY_NAME, {
      expiryDateStr: '21 October 2026',
      unsubscribeToken: DUMMY_UNSUBSCRIBE_TOKEN,
      feedbackUrl: 'mailto:support@mommanager.co.uk?subject=What%20could%20we%20do%20better%3F',
    }) },
    { key: 'billing_issue', template: billingIssueEmail(DUMMY_NAME, 'PLAY_STORE') },
    { key: 'we_miss_you', template: weMissYouEmail(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN) },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = req.headers.get('Authorization') ?? '';
  if (!DEV_PREVIEW_SECRET || auth !== `Bearer ${DEV_PREVIEW_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let to: string | undefined;
  let only: string | undefined;
  try {
    ({ to, only } = await req.json());
  } catch {
    // fall through — handled below
  }
  if (!to) {
    return new Response(JSON.stringify({ error: 'Missing "to" in request body' }), { status: 400 });
  }

  const set = previewSet();
  const selected = only ? set.filter((s) => s.key === only) : set;
  if (only && selected.length === 0) {
    return new Response(JSON.stringify({ error: `Unknown "only" key: ${only}`, validKeys: set.map((s) => s.key) }), { status: 400 });
  }

  const results: { subject: string; ok: boolean; error?: string }[] = [];
  for (const { template } of selected) {
    try {
      await sendViaResend({ to, subject: `[PREVIEW] ${template.subject}`, html: template.html, text: template.text });
      results.push({ subject: template.subject, ok: true });
    } catch (err) {
      results.push({ subject: template.subject, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(JSON.stringify({ sent: results.filter((r) => r.ok).length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
