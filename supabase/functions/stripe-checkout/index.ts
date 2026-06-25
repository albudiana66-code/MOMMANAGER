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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { priceId, userId, email, plan } = await req.json();

    if (!priceId || !userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Determine origin — works for web deployment and Capacitor (https://localhost)
    const origin = req.headers.get('origin') || 'https://localhost';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { userId, plan: plan || 'unknown' },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      allow_promotion_codes: true,
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
