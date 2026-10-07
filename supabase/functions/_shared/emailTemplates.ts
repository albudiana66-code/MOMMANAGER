import { APP_URL, cancelInstructionsFor, formatPrice, periodFromProductId, renderEmail, unsubscribeUrlFor, type RenderedEmail } from './emailLayout.ts';

export interface TemplateResult extends RenderedEmail {
  subject: string;
}

function firstName(name: string | null | undefined): string {
  return (name || '').trim().split(' ')[0] || 'there';
}

// ── Trial sequence (day 0 / 1 / 3 / 5 / 6) ──────────────────────────────────
// Marketing-ish (tips/onboarding) per Step 4 — all carry an unsubscribe link.

export function trialDay0Email(name: string | null, unsubscribeToken: string): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Welcome to MomManager, ${n} 💛`,
      `Thank you for giving it a try. MomManager helps you keep the whole family's calendar, meals, kids' activities, self-care and budget in one calm place — instead of five different apps and a notebook on the fridge.`,
      `Three quick first steps to get the most out of your trial:`,
      `1. <strong>Add your week</strong> to the calendar — appointments, school events, anything coming up.<br>2. <strong>Plan this week's meals</strong> in Kitchen — takes a couple of minutes.<br>3. <strong>Turn on reminders</strong> in Settings so you never miss a thing.`,
    ],
    bodyTextParagraphs: [
      `Welcome to MomManager, ${n}!`,
      `Thank you for giving it a try. MomManager helps you keep the whole family's calendar, meals, kids' activities, self-care and budget in one calm place.`,
      `Three quick first steps:`,
      `1. Add your week to the calendar\n2. Plan this week's meals in Kitchen\n3. Turn on reminders in Settings`,
    ],
    ctaLabel: 'Open MomManager',
    ctaUrl: `${APP_URL}/`,
  }, unsubscribeUrlFor(unsubscribeToken));
  return { subject: 'Welcome to MomManager 💛', html, text };
}

export function trialDay1Email(name: string | null, unsubscribeToken: string): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `Quick tip: add a reminder to any calendar event or task and MomManager will nudge you before it happens — on your lock screen, even if the app's closed.`,
      `Never miss a school event, appointment, or "it's your turn for the bake sale" again.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `Quick tip: add a reminder to any calendar event or task and MomManager will nudge you before it happens — even if the app's closed.`,
      `Never miss a school event or appointment again.`,
    ],
    ctaLabel: 'Open your calendar',
    ctaUrl: `${APP_URL}/tasks`,
  }, unsubscribeUrlFor(unsubscribeToken));
  return { subject: 'Never miss a school event or appointment', html, text };
}

export function trialDay3Email(name: string | null, unsubscribeToken: string): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `Dinner time stress is real. In Kitchen, you can plan the whole week's meals and generate a shopping list from them — in about 5 minutes.`,
      `Future-you on a Tuesday evening will say thank you.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `In Kitchen, you can plan the whole week's meals and generate a shopping list from them — in about 5 minutes.`,
    ],
    ctaLabel: 'Plan this week’s meals',
    ctaUrl: `${APP_URL}/kitchen`,
  }, unsubscribeUrlFor(unsubscribeToken));
  return { subject: 'Plan the week’s meals in 5 minutes', html, text };
}

export function trialDay5Email(name: string | null, unsubscribeToken: string): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `You look after everyone else — Self-care has gentle routines just for you. And if you're short on time, ask the AI assistant to plan your week; it'll pull your calendar, meals and kids' activities together for you.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `Self-care has gentle routines just for you. And the AI assistant can plan your whole week for you — just ask.`,
    ],
    ctaLabel: 'Try the AI assistant',
    ctaUrl: `${APP_URL}/selfcare`,
  }, unsubscribeUrlFor(unsubscribeToken));
  return { subject: 'A little me-time (and a shortcut) 💛', html, text };
}

/** Day 6 is a service email (trial-ending notice) — no unsubscribe link. */
export function trialDay6Email(
  name: string | null,
  opts: { priceString: string | null; period: 'month' | 'year'; store: string | null }
): TemplateResult {
  const n = firstName(name);
  const priceLine = opts.priceString
    ? `Then it's <strong>${opts.priceString} per ${opts.period}</strong>.`
    : `Then your subscription continues at the price you saw when you started your trial.`;
  const priceLineText = opts.priceString
    ? `Then it's ${opts.priceString} per ${opts.period}.`
    : `Then your subscription continues at the price you saw when you started your trial.`;
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `Just a heads-up — your free trial ends tomorrow. ${priceLine}`,
      `Nothing to do if you'd like to keep going. ${cancelInstructionsFor(opts.store)}`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `Just a heads-up — your free trial ends tomorrow. ${priceLineText}`,
      `Nothing to do if you'd like to keep going. To cancel: ${opts.store === 'PLAY_STORE' ? 'open Google Play > Subscriptions.' : 'open iPhone Settings > [your name] > Subscriptions.'}`,
    ],
    ctaLabel: 'Open MomManager',
    ctaUrl: `${APP_URL}/`,
  });
  return { subject: 'Your free trial ends tomorrow', html, text };
}

// ── Event emails ─────────────────────────────────────────────────────────────

export function subscribedEmail(name: string | null): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Thank you for joining MomManager, ${n} 🌸`,
      `You now have full access — the calendar, kids' activities, kitchen &amp; meal planning, self-care routines, the AI assistant, and your budget tracker, all in one place.`,
      `If you ever have a question, a bit of feedback, or just want to say hi, reply to this email — it comes straight to me.`,
    ],
    bodyTextParagraphs: [
      `Thank you for joining MomManager, ${n}!`,
      `You now have full access — calendar, kids' activities, kitchen & meal planning, self-care, the AI assistant, and your budget tracker.`,
      `Questions or feedback? Just reply to this email — it comes straight to me.`,
    ],
    ctaLabel: 'Open MomManager',
    ctaUrl: `${APP_URL}/`,
  });
  return { subject: 'Thank you for joining MomManager', html, text };
}

export function cancellationEmail(
  name: string | null,
  opts: { expiryDateStr: string; unsubscribeToken: string; feedbackUrl: string }
): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `Sorry to see you go. Your subscription has been cancelled — you'll still have full access until <strong>${opts.expiryDateStr}</strong>, nothing changes before then.`,
      `No pressure at all, but if you have a minute, I'd love to know <a href="${opts.feedbackUrl}">what we could do better</a> — it genuinely helps.`,
      `And if you change your mind, you can pick up right where you left off any time.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `Sorry to see you go. Your subscription has been cancelled — you'll still have full access until ${opts.expiryDateStr}.`,
      `If you have a minute, what could we do better? ${opts.feedbackUrl}`,
      `If you change your mind, you can resubscribe any time.`,
    ],
    ctaLabel: 'Resubscribe any time',
    ctaUrl: `${APP_URL}/paywall`,
  }, unsubscribeUrlFor(opts.unsubscribeToken));
  return { subject: 'Sorry to see you go 💛', html, text };
}

export function billingIssueEmail(name: string | null, store: string | null): TemplateResult {
  const n = firstName(name);
  const where = store === 'PLAY_STORE' ? 'Google Play > Subscriptions' : 'iPhone Settings > [your name] > Subscriptions';
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `There's a small problem with your payment for MomManager — your bank may have declined the charge, or a card's expired.`,
      `To keep your access, update your payment details in <strong>${where}</strong>. Once it's sorted, everything picks back up automatically — no need to resubscribe.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `There's a small problem with your payment for MomManager.`,
      `To keep your access, update your payment details in ${where}. Once it's sorted, everything picks back up automatically.`,
    ],
    ctaLabel: 'Open MomManager',
    ctaUrl: `${APP_URL}/settings`,
  });
  return { subject: 'There’s a problem with your payment', html, text };
}

export function weMissYouEmail(name: string | null, unsubscribeToken: string): TemplateResult {
  const n = firstName(name);
  const { html, text } = renderEmail({
    bodyHtmlParagraphs: [
      `Hi ${n},`,
      `It's been a week since your MomManager access ended, and we miss having you. Your data's still there, safe and waiting — the calendar, meals, kids' activities, everything.`,
      `If you'd like to pick back up, you can resubscribe any time.`,
    ],
    bodyTextParagraphs: [
      `Hi ${n},`,
      `It's been a week since your MomManager access ended. Your data's still there, safe and waiting.`,
      `If you'd like to pick back up, you can resubscribe any time.`,
    ],
    ctaLabel: 'Come back to MomManager',
    ctaUrl: `${APP_URL}/paywall`,
  }, unsubscribeUrlFor(unsubscribeToken));
  return { subject: 'We miss you 🌸', html, text };
}

export { formatPrice, periodFromProductId };
