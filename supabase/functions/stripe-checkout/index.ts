// Supabase Edge Function — creates a Stripe Checkout Session
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy stripe-checkout --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Secrets ───────────────────────────────────────────────────────────────────
// npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref giprbmoteojghxzodpcw
//
// ── Fallback while not deployed ───────────────────────────────────────────────
// Set PAYMENT_LINKS in src/lib/stripe.ts with links from:
// Stripe Dashboard → Payment Links → Create link for each plan (Standard/Pro × Monthly/Yearly)

import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mirrors PRICES in src/lib/stripe.ts. Kept server-side so the checkout
// amount is never trusted from the client — only the plan + currency are.
const PRICE_TABLE: Record<string, { productName: string; interval: 'month' | 'year'; amounts: Record<string, number> }> = {
  standard_monthly: { productName: 'MomManager Standard', interval: 'month', amounts: { gbp: 4.99, eur: 5.99, usd: 5.99 } },
  standard_yearly:  { productName: 'MomManager Standard', interval: 'year', amounts: { gbp: 39.99, eur: 47.99, usd: 49.99 } },
  pro_monthly:      { productName: 'MomManager Pro', interval: 'month', amounts: { gbp: 7.99, eur: 8.99, usd: 9.99 } },
  pro_yearly:       { productName: 'MomManager Pro', interval: 'year', amounts: { gbp: 59.99, eur: 71.99, usd: 79.99 } },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { userId, email, plan, currency } = await req.json();

    const priceInfo = PRICE_TABLE[plan];
    if (!priceInfo || !userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Trust only a known currency — fall back to usd rather than letting an
    // unrecognized value reach Stripe.
    const resolvedCurrency = ['gbp', 'eur', 'usd'].includes(currency) ? currency : 'usd';
    const amount = priceInfo.amounts[resolvedCurrency];

    // Determine origin — works for web deployment and Capacitor (https://localhost)
    const origin = req.headers.get('origin') || 'https://localhost';

    // On native (Capacitor's WebView always reports origin https://localhost),
    // checkout is opened in an in-app browser tab, not the app's own WebView —
    // https://localhost isn't reachable from there, so the redirect back into
    // the app must go through the custom URL scheme instead (same mechanism
    // already used for the Google OAuth native callback).
    const isNative = origin === 'https://localhost';
    const successUrl = isNative
      ? 'com.soldoutdigital.mommanager://payment-callback?session_id={CHECKOUT_SESSION_ID}'
      : `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = isNative
      ? 'com.soldoutdigital.mommanager://payment-cancel'
      : `${origin}/paywall`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      // Stripe's own Adaptive Pricing picks a presentment currency from the
      // buyer's checkout-time IP, independent of the currency our paywall
      // screen already showed (guessed from the device locale). The two can
      // disagree — Google Play flagged exactly this as inconsistent pricing
      // between the offers page and payment cart. Building the line item
      // inline with the same currency+amount the client already displayed
      // guarantees both screens always match.
      line_items: [{
        price_data: {
          currency: resolvedCurrency,
          unit_amount: Math.round(amount * 100),
          recurring: { interval: priceInfo.interval },
          product_data: { name: priceInfo.productName },
        },
        quantity: 1,
      }],
      customer_email: email || undefined,
      metadata: { userId, plan },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      allow_promotion_codes: false,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    console.error('stripe-checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
