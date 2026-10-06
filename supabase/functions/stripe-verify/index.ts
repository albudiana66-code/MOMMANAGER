// Supabase Edge Function — verifies a Stripe Checkout Session
// Called by the /success page to confirm payment and get subscription details
// Deploy: npx supabase functions deploy stripe-verify --project-ref giprbmoteojghxzodpcw

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const sub = session.subscription as Stripe.Subscription | null;

    let nextBillingDate: string | null = null;
    let planInterval: 'month' | 'year' | null = null;

    if (sub) {
      const item = sub.items.data[0];
      nextBillingDate = new Date(sub.current_period_end * 1000).toISOString();
      planInterval = item?.price?.recurring?.interval as 'month' | 'year' | null ?? null;
    }

    const paid = session.payment_status === 'paid';
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan || (planInterval === 'year' ? 'standard_yearly' : 'standard_monthly');

    // Server-side source of truth: only a confirmed-paid Stripe session can
    // grant access. The client never sets subscription_status directly.
    if (paid && userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabase
        .from('profiles')
        .update({
          subscription_status: plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub?.id ?? null,
          subscription_end_date: nextBillingDate,
        })
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({
        paid,
        status: session.payment_status,
        plan,
        planInterval,
        email: session.customer_email,
        userId,
        customerId: session.customer as string,
        subscriptionId: sub?.id ?? null,
        nextBillingDate,
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (err) {
    console.error('stripe-verify error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
