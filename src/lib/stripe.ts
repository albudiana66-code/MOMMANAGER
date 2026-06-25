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

// Direct Stripe Payment Links — fill these in from Stripe Dashboard → Payment Links
// These work immediately without a deployed backend.
export const PAYMENT_LINKS: Record<string, string> = {
  standard_monthly: 'https://buy.stripe.com/eVq9AL0Wo7274ZTahDcbC00',
  standard_yearly:  'https://buy.stripe.com/6oUfZ98oQ86b1NH4XjcbC01',
  pro_monthly:      'https://buy.stripe.com/3cI8wHdJabincslahDcbC02',
  pro_yearly:       'https://buy.stripe.com/28E3cndJa3PV3VPcpLcbC03',
};

/**
 * Returns a Stripe Checkout URL for the given plan.
 * 1. Tries the deployed Supabase Edge Function (stripe-checkout).
 * 2. Falls back to a direct Stripe Payment Link if the function is unavailable.
 */
export async function createCheckoutSession(
  plan: SubscriptionPlan,
  userId = '',
  email = ''
): Promise<string> {
  const planKey = plan as keyof typeof PRICES;
  const priceId = PRICES[planKey]?.priceId ?? '';

  // ── Try Edge Function ──────────────────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          priceId,
          userId,
          email,
          successUrl: window.location.origin + '/payment-success',
          cancelUrl:  window.location.origin + '/paywall',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch {
      console.log('[Stripe] Edge function unavailable — using payment link fallback');
    }
  }

  // ── Fallback: direct payment link ─────────────────────────────────────────
  return PAYMENT_LINKS[planKey] ?? 'https://stripe.com';
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
