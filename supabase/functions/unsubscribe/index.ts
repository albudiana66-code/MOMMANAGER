// Supabase Edge Function — one-click email unsubscribe, no login required.
//
// Deploy: npx supabase functions deploy unsubscribe --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// Linked from the footer of every marketing-ish email (trial tips/onboarding,
// "we miss you") via emailLayout.ts's unsubscribeUrlFor(). Service emails
// (welcome, subscribed, cancellation, billing issue, trial-ending) never
// link here — they always send regardless of this preference.

import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function page(title: string, message: string): Response {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:-apple-system,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:60px 20px;">
    <table width="420" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(196,120,138,0.1);">
      <div style="font-size:36px;margin-bottom:12px;">🌸</div>
      <h1 style="color:#2C2A35;font-size:20px;margin:0 0 8px;">${title}</h1>
      <p style="color:#7A7585;font-size:15px;line-height:1.5;margin:0;">${message}</p>
    </table>
  </td></tr></table>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return page('Link not valid', 'This unsubscribe link is missing its token. Please use the link from the original email.');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('email_preferences')
    .update({ marketing_opt_in: false })
    .eq('unsubscribe_token', token)
    .select('user_id')
    .single();

  if (error || !data) {
    console.error('unsubscribe: token not found', token, error?.message);
    return page('Link not valid', 'We couldn’t find that unsubscribe link. It may have already been used, or you may already be unsubscribed.');
  }

  return page('You’re unsubscribed', 'You won’t get tips, onboarding emails, or the occasional "we miss you" note from MomManager any more. You’ll still get important account emails like billing or cancellation notices. You can turn these back on any time in the app’s Settings.');
});
