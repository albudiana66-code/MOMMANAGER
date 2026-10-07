// Shared HTML + plain-text layout for every lifecycle email — branding,
// the one call-to-action button, "Diana, founder" signature, and the
// GDPR/PECR-required footer (company details, privacy link, and an
// unsubscribe link on marketing-ish emails only).

export const APP_URL = 'https://mommanager.app';
export const PRIVACY_URL = `${APP_URL}/privacy`;
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
/** Shown in every footer as the visible contact address — matches resend.ts's REPLY_TO, since reply-to headers aren't always surfaced by mail clients. */
export const SUPPORT_EMAIL = 'support@mommanager.co.uk';

export interface EmailContent {
  /** Rendered as a single paragraph-per-string block; keep it short. */
  bodyHtmlParagraphs: string[];
  bodyTextParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  /** Shown in brackets under the signature for extra context, e.g. a price line. Optional. */
  footnoteHtml?: string;
  footnoteText?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const SIGNATURE_HTML = `
  <p style="color:#2C2A35;font-size:15px;margin:24px 0 0;">Warmly,<br><strong>Diana</strong><br><span style="color:#9A94A8;font-size:13px;">Founder, MomManager</span></p>
`;
const SIGNATURE_TEXT = '\nWarmly,\nDiana\nFounder, MomManager\n';

/**
 * unsubscribeUrl: pass a URL to show the one-click unsubscribe footer line
 * (tips/onboarding + "we miss you" emails). Omit it for service emails
 * (welcome, subscribed, cancellation, billing issue, trial-ending), which
 * always send and never carry an unsubscribe link.
 */
export function renderEmail(content: EmailContent, unsubscribeUrl?: string): RenderedEmail {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MomManager</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:-apple-system,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(196,120,138,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#C4788A,#9B6B8A);padding:28px;text-align:center;">
              <div style="font-size:36px;margin-bottom:6px;">🌸</div>
              <div style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">MomManager</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content.bodyHtmlParagraphs.map((p) => `<p style="color:#4A4555;font-size:15px;line-height:1.6;margin:0 0 16px;">${p}</p>`).join('\n')}
              <a href="${content.ctaUrl}" style="display:block;background:linear-gradient(135deg,#C4788A,#B5697B);color:#ffffff;text-align:center;padding:15px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;margin:8px 0 0;">${content.ctaLabel}</a>
              ${content.footnoteHtml ? `<p style="color:#9A94A8;font-size:12px;text-align:center;margin:14px 0 0;">${content.footnoteHtml}</p>` : ''}
              ${SIGNATURE_HTML}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;border-top:1px solid #F2E4E8;">
              <p style="color:#B0ACBA;font-size:11px;margin:0;line-height:1.6;">
                Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#B0ACBA;text-decoration:underline;">${SUPPORT_EMAIL}</a><br>
                Sold Out Digital Ltd · Company No. 17217131<br>
                <a href="${PRIVACY_URL}" style="color:#B0ACBA;text-decoration:underline;">Privacy policy</a>
                ${unsubscribeUrl ? ` · <a href="${unsubscribeUrl}" style="color:#B0ACBA;text-decoration:underline;">Unsubscribe from these emails</a>` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    'MomManager',
    '',
    ...content.bodyTextParagraphs,
    '',
    `${content.ctaLabel}: ${content.ctaUrl}`,
    content.footnoteText ? `\n${content.footnoteText}` : '',
    SIGNATURE_TEXT,
    '---',
    `Need help? ${SUPPORT_EMAIL}`,
    'Sold Out Digital Ltd · Company No. 17217131',
    `Privacy policy: ${PRIVACY_URL}`,
    unsubscribeUrl ? `Unsubscribe from these emails: ${unsubscribeUrl}` : '',
  ].filter(Boolean).join('\n');

  return { html, text };
}

export function unsubscribeUrlFor(token: string): string {
  return `${SUPABASE_URL}/functions/v1/unsubscribe?token=${token}`;
}

/** Store-specific "how to cancel" line, matching the wording already used in-app (trialDisclosure.cancelApple/cancelGoogle). */
export function cancelInstructionsFor(store: string | null): string {
  if (store === 'PLAY_STORE') {
    return 'To cancel, open Google Play &gt; Subscriptions on your Android device.';
  }
  return 'To cancel, open iPhone Settings &rarr; [your name] &rarr; Subscriptions.';
}

export function formatPrice(price: number | null | undefined, currency: string | null | undefined): string | null {
  if (!price || price <= 0 || !currency) return null;
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(price);
  } catch {
    return null;
  }
}

export function periodFromProductId(productId: string | null | undefined): 'month' | 'year' {
  return productId?.endsWith('_yearly') ? 'year' : 'month';
}
