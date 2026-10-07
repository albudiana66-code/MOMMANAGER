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

function previewSet(): TemplateResult[] {
  return [
    trialDay0Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN),
    trialDay1Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN),
    trialDay3Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN),
    trialDay5Email(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN),
    trialDay6Email(DUMMY_NAME, { priceString: '£7.99', period: 'month', store: 'APP_STORE' }),
    subscribedEmail(DUMMY_NAME),
    cancellationEmail(DUMMY_NAME, {
      expiryDateStr: '21 October 2026',
      unsubscribeToken: DUMMY_UNSUBSCRIBE_TOKEN,
      feedbackUrl: 'mailto:support@mommanager.co.uk?subject=What%20could%20we%20do%20better%3F',
    }),
    billingIssueEmail(DUMMY_NAME, 'PLAY_STORE'),
    weMissYouEmail(DUMMY_NAME, DUMMY_UNSUBSCRIBE_TOKEN),
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = req.headers.get('Authorization') ?? '';
  if (!DEV_PREVIEW_SECRET || auth !== `Bearer ${DEV_PREVIEW_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let to: string | undefined;
  try {
    ({ to } = await req.json());
  } catch {
    // fall through — handled below
  }
  if (!to) {
    return new Response(JSON.stringify({ error: 'Missing "to" in request body' }), { status: 400 });
  }

  const results: { subject: string; ok: boolean; error?: string }[] = [];
  for (const template of previewSet()) {
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
