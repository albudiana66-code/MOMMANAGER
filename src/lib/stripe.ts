import type { SubscriptionPlan } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const PRICES: Record<
  'standard_monthly' | 'standard_yearly' | 'pro_monthly' | 'pro_yearly',
  { amount: number; currency: string; display: string; priceId: string }
> = {
  standard_monthly: { amount: 999,   currency: 'gbp', display: '£9.99/month',  priceId: 'price_1TWZzq1fZpEfuOBVxNQOHwTe' },
  standard_yearly:  { amount: 7999,  currency: 'gbp', display: '£79.99/year',  priceId: 'price_1TWa1g1fZpEfuOBVoieAFEj1' },
  pro_monthly:      { amount: 1499,  currency: 'gbp', display: '£14.99/month', priceId: 'price_1TlAs71fZpEfuOBVHMNV6KS2' },
  pro_yearly:       { amount: 12999, currency: 'gbp', display: '£129.99/year', priceId: 'price_1TlAsS1fZpEfuOBVkuQSz4xR' },
};

/**
 * Creates a Stripe Checkout Session via the Supabase Edge Function.
 * Always uses GBP — no Payment Link fallback to avoid Adaptive Pricing issues.
 */
export async function createCheckoutSession(
  plan: SubscriptionPlan,
  userId = '',
  email = ''
): Promise<string> {
  const planKey = plan as keyof typeof PRICES;
  const priceId = PRICES[planKey]?.priceId ?? '';

  if (!priceId) throw new Error('Invalid plan selected.');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service not configured.');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ priceId, userId, email }),
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout. Please try again.');
  }
  return data.url;
}

export async function createPortalSession(customerId: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      customerId,
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
  plan: 'monthly' | 'annual';
  planInterval: 'month' | 'year' | null;
  email: string;
  userId: string;
  customerId: string;
  subscriptionId: string | null;
  nextBillingDate: string | null;
}

export async function verifySession(_sessionId: string): Promise<VerifiedSession> {
  throw new Error('Stripe verification not configured');
}
