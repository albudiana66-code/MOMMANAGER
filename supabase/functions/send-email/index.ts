// Supabase Edge Function — sends transactional emails via Resend
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy send-email --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Secrets ───────────────────────────────────────────────────────────────────
// npx supabase secrets set RESEND_API_KEY=re_... --project-ref giprbmoteojghxzodpcw

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'noreply@mommanager.app';
const FROM_NAME = 'MomManager';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  return response.json();
}

// ── Base template ─────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MomManager</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(196,120,138,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#C4788A,#9B6B8A);padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🌸</div>
              <div style="color:white;font-size:24px;font-weight:600;letter-spacing:-0.5px;">MomManager</div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">Your personal family organiser</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;border-top:1px solid #F2E4E8;">
              <p style="color:#B0ACBA;font-size:12px;margin:0;">MomManager · Sold Out Digital Ltd</p>
              <p style="color:#B0ACBA;font-size:12px;margin:4px 0 0;">Questions? Email us at support@mommanager.app</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email templates ───────────────────────────────────────────────────────────

function welcomeEmail(name: string, plan: string): string {
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Welcome, ${name}! 🎉</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">You're now on the <strong style="color:#C4788A;">MomManager ${plan}</strong> plan. Let's get started!</p>

    <div style="background:#F2E4E8;border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="color:#2C2A35;font-size:14px;font-weight:600;margin:0 0 12px;">✨ What's included in your plan:</p>
      <ul style="color:#7A7585;font-size:14px;margin:0;padding-left:20px;line-height:1.8;">
        <li>Calendar &amp; task management</li>
        <li>AI activities generator for kids</li>
        <li>Kitchen &amp; meal planning</li>
        <li>Self-care routines &amp; wellness tracking</li>
        <li>Budget tracker</li>
      </ul>
    </div>

    <a href="https://mommanager.app" style="display:block;background:linear-gradient(135deg,#C4788A,#B5697B);color:white;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">Open MomManager 🌸</a>
  `);
}

function paymentConfirmedEmail(name: string, plan: string): string {
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Payment confirmed ✅</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">Hi ${name}, your payment for <strong style="color:#C4788A;">MomManager ${plan}</strong> has been successfully processed.</p>
    <p style="color:#7A7585;font-size:14px;">Your subscription is now active and will automatically renew. You can manage or cancel your subscription anytime from the Settings screen in the app.</p>
    <div style="background:#EAF0E8;border-radius:12px;padding:16px;margin:24px 0;text-align:center;">
      <p style="color:#8FA888;font-size:14px;margin:0;">💚 Cancel anytime · No hidden fees · Secure payment via Stripe</p>
    </div>
  `);
}

function renewedEmail(name: string, plan: string, expiresAt: string): string {
  const renewalDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Subscription renewed 🌸</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">Hi ${name}, your <strong style="color:#C4788A;">MomManager ${plan}</strong> subscription has been renewed.</p>
    ${renewalDate ? `<p style="color:#7A7585;font-size:14px;">Next renewal date: <strong>${renewalDate}</strong></p>` : ''}
    <p style="color:#7A7585;font-size:14px;">Thank you for being part of the MomManager family! 💕</p>
  `);
}

function cancelledEmail(name: string, expiresAt: string): string {
  const endDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Subscription cancelled</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">Hi ${name}, your MomManager subscription has been cancelled.</p>
    ${endDate ? `<div style="background:#F2E4E8;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="color:#C4788A;font-size:14px;margin:0;">You still have access until <strong>${endDate}</strong></p></div>` : ''}
    <p style="color:#7A7585;font-size:14px;">We're sorry to see you go. If you change your mind, you can resubscribe anytime.</p>
    <a href="https://mommanager.app/paywall" style="display:block;background:linear-gradient(135deg,#C4788A,#B5697B);color:white;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;margin-top:24px;">Resubscribe 🌸</a>
  `);
}

function trialEndingEmail(name: string): string {
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Your trial ends in 2 days ⏰</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">Hi ${name}, your MomManager free trial is ending soon.</p>
    <p style="color:#7A7585;font-size:14px;margin:0 0 24px;">To keep access to all your tasks, meal plans, kids activities and self-care routines, choose a plan before your trial ends.</p>
    <a href="https://mommanager.app/paywall" style="display:block;background:linear-gradient(135deg,#C4788A,#B5697B);color:white;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">Choose a plan 🌸</a>
    <p style="color:#B0ACBA;font-size:12px;text-align:center;margin-top:16px;">Starting from £4.99/month · Cancel anytime</p>
  `);
}

function trialExpiredEmail(name: string): string {
  return baseTemplate(`
    <h1 style="color:#2C2A35;font-size:24px;font-weight:600;margin:0 0 8px;">Your trial has ended</h1>
    <p style="color:#7A7585;font-size:16px;margin:0 0 24px;">Hi ${name}, your MomManager free trial has ended.</p>
    <p style="color:#7A7585;font-size:14px;margin:0 0 24px;">Your data is safe — subscribe now to regain access to all your family planning tools.</p>
    <a href="https://mommanager.app/paywall" style="display:block;background:linear-gradient(135deg,#C4788A,#B5697B);color:white;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">Subscribe now 🌸</a>
    <p style="color:#B0ACBA;font-size:12px;text-align:center;margin-top:16px;">Starting from £4.99/month · Cancel anytime</p>
  `);
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { type, email, name, plan, expiresAt } = await req.json();

    if (!type || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const planName = plan?.includes('pro') ? 'Pro' : 'Standard';
    const firstName = name?.split(' ')[0] || 'there';

    let subject = '';
    let html = '';

    switch (type) {
      case 'welcome':
        subject = `Welcome to MomManager ${planName}! 🌸`;
        html = welcomeEmail(firstName, planName);
        break;
      case 'payment_confirmed':
        subject = `Payment confirmed — MomManager ${planName}`;
        html = paymentConfirmedEmail(firstName, planName);
        break;
      case 'subscription_renewed':
        subject = `Your MomManager subscription has renewed ✨`;
        html = renewedEmail(firstName, planName, expiresAt || '');
        break;
      case 'subscription_cancelled':
        subject = `Your MomManager subscription has been cancelled`;
        html = cancelledEmail(firstName, expiresAt || '');
        break;
      case 'trial_ending':
        subject = `Your free trial ends in 2 days 🌸`;
        html = trialEndingEmail(firstName);
        break;
      case 'trial_expired':
        subject = `Your MomManager trial has ended`;
        html = trialExpiredEmail(firstName);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
    }

    const result = await sendEmail(email, subject, html);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
