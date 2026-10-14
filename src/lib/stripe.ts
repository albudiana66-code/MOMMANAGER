import type { SubscriptionPlan } from '../types';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// The edge functions verify the caller is a signed-in user, so requests must
// carry the current user's own access token — the anon key alone is rejected.
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function currentUser(): Promise<{ id: string; email: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('You must be signed in to subscribe.');
  return { id: data.user.id, email: data.user.email ?? '' };
}

export type Currency = 'gbp' | 'eur' | 'usd';

export const CURRENCY_SYMBOL: Record<Currency, string> = { gbp: '£', eur: '€', usd: '$' };

const EUR_COUNTRIES = new Set([
  'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'IE', 'FI',
  'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT',
]);

// Best-effort locale-based guess for the price shown on our own paywall —
// the actual charge always follows Stripe's own Adaptive Pricing (detected
// from the buyer's IP at checkout). This keeps the two screens showing the
// same currency for the vast majority of users, since we mirror these same
// GBP/EUR/USD amounts as currency_options on each Stripe Price object.
export function detectCurrency(): Currency {
  try {
    const region = (navigator.language || 'en-GB').split('-')[1]?.toUpperCase();
    if (region === 'GB') return 'gbp';
    if (region === 'US') return 'usd';
    if (region && EUR_COUNTRIES.has(region)) return 'eur';
  } catch {
    // navigator unavailable (SSR/tests) — fall through to default
  }
  // The app targets UK users first — any unrecognised/undetectable locale
  // (including non-GB/US/EUR regions, e.g. testing from elsewhere) must
  // default to GBP, never USD.
  return 'gbp';
}

export const PRICES: Record<
  'standard_monthly' | 'standard_yearly' | 'pro_monthly' | 'pro_yearly',
  { amount: number; currency: string; display: string; amounts: Record<Currency, number> }
> = {
  standard_monthly: { amount: 499,  currency: 'gbp', display: '£4.99/month',  amounts: { gbp: 4.99,  eur: 5.99,  usd: 5.99 } },
  standard_yearly:  { amount: 3999, currency: 'gbp', display: '£39.99/year',  amounts: { gbp: 39.99, eur: 47.99, usd: 49.99 } },
  pro_monthly:      { amount: 799,  currency: 'gbp', display: '£7.99/month',  amounts: { gbp: 7.99,  eur: 8.99,  usd: 9.99 } },
  pro_yearly:       { amount: 5999, currency: 'gbp', display: '£59.99/year',  amounts: { gbp: 59.99, eur: 71.99, usd: 79.99 } },
};

export function formatAmount(currency: Currency, amount: number): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toFixed(2)}`;
}

/**
 * Creates a Stripe Checkout Session via the Supabase Edge Function.
 *
 * Sends the same currency already shown on the paywall so the checkout
 * page can't show a different one — the edge function builds the line
 * item's price inline in that currency rather than relying on Stripe's
 * IP-based Adaptive Pricing, which could pick a different currency than
 * the one the user already saw here.
 */
export async function createCheckoutSession(plan: SubscriptionPlan): Promise<string> {
  const planKey = plan as keyof typeof PRICES;
  if (!PRICES[planKey]) throw new Error('Invalid plan selected.');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service not configured.');

  const { id: userId, email } = await currentUser();
  const currency = detectCurrency();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ plan, userId, email, currency }),
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout. Please try again.');
  }
  return data.url;
}

// The server looks up the signed-in user's own Stripe customer — it no longer
// accepts a client-supplied customerId (that would let anyone open anyone
// else's billing portal).
export async function createPortalSession(): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      returnUrl: window.location.origin + '/settings',
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export function openCheckout(url: string): void {
  window.location.href = url;
}

// Legacy export kept for SuccessScreen compatibility
export const STRIPE_PRICES = {
  monthly: '',
  annual: '',
};

export interface VerifiedSession {
  paid: boolean;
  status: string;
  plan: SubscriptionPlan;
  planInterval: 'month' | 'year' | null;
  email: string;
  userId: string;
  customerId: string;
  subscriptionId: string | null;
  nextBillingDate: string | null;
}

// Confirms payment directly with Stripe via the stripe-verify Edge Function.
// The function itself updates the user's profile server-side — this call
// only reports back what happened so the UI can reflect it.
export async function verifySession(sessionId: string): Promise<VerifiedSession> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service not configured.');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-verify`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ sessionId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not verify payment.');
  return data as VerifiedSession;
}
