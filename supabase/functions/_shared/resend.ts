// Thin Resend wrapper shared by every function that sends a lifecycle
// email (revenuecat-webhook, email-scheduler, send-email-preview).
//
// Secret needed: RESEND_API_KEY (already set for the existing send-email
// function — reused here, not duplicated).

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

// mommanager.app is the verified sending domain in Resend. Reply-to is the
// .co.uk support address so replies land in the inbox customers already
// know from the privacy policy/terms, not the sending domain.
export const FROM = 'Diana at MomManager <hello@mommanager.app>';
export const REPLY_TO = 'support@mommanager.co.uk';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendViaResend(opts: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      reply_to: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
