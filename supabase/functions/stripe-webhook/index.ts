// Supabase Edge Function — handles Stripe webhook events
// Deploy: npx supabase functions deploy stripe-webhook --project-ref giprbmoteojghxzodpcw
// Secrets needed:
//   npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... --project-ref giprbmoteojghxzodpcw
//
// In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://giprbmoteojghxzodpcw.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.deleted,
//            customer.subscription.updated, invoice.payment_failed

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendEmail(type: string, email: string, name: string, plan?: string, expiresAt?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ type, email, name, plan, expiresAt }),
    });
  } catch (err) {
    // Email sending is non-critical — log and continue
    console.error('send-email failed:', err);
  }
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'standard_monthly';
        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          // Source of truth for what actually gates app access
          await supabase
            .from('profiles')
            .update({
              subscription_status: plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('id', userId);

          // Fetch profile for email
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', userId)
            .single();

          const email = profile?.email || session.customer_email || '';
          const name = profile?.name || '';

          if (email) {
            await sendEmail('welcome', email, name, plan);
            await sendEmail('payment_confirmed', email, name, plan);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);

        // Fetch profile for email
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('user_id, plan')
          .eq('stripe_subscription_id', sub.id)
          .single();
        if (subRow) {
          // Revoke access once the subscription is actually gone
          await supabase
            .from('profiles')
            .update({ subscription_status: null })
            .eq('id', subRow.user_id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', subRow.user_id)
            .single();
          if (profile?.email) {
            await sendEmail('subscription_cancelled', profile.email, profile.name || '', subRow.plan, expiresAt);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const prevSub = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'expired'
          : 'expired';
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await supabase
          .from('subscriptions')
          .update({
            status,
            subscription_end_date: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        // Keep the field that actually gates app access in sync with Stripe
        if (status === 'expired') {
          const { data: expiredRow } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', sub.id)
            .single();
          if (expiredRow) {
            await supabase
              .from('profiles')
              .update({ subscription_status: null })
              .eq('id', expiredRow.user_id);
          }
        } else if (status === 'active') {
          const { data: activeRow } = await supabase
            .from('subscriptions')
            .select('user_id, plan')
            .eq('stripe_subscription_id', sub.id)
            .single();
          if (activeRow) {
            await supabase
              .from('profiles')
              .update({ subscription_status: activeRow.plan, subscription_end_date: expiresAt })
              .eq('id', activeRow.user_id);
          }
        }

        // Send renewal email when billing period advances (current_period_end changed)
        const periodAdvanced = prevSub?.current_period_end !== undefined
          && prevSub.current_period_end !== sub.current_period_end;
        if (sub.status === 'active' && periodAdvanced) {
          const { data: subRow } = await supabase
            .from('subscriptions')
            .select('user_id, plan')
            .eq('stripe_subscription_id', sub.id)
            .single();
          if (subRow) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', subRow.user_id)
              .single();
            if (profile?.email) {
              await sendEmail('subscription_renewed', profile.email, profile.name || '', subRow.plan, expiresAt);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
