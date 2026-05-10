import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

export const stripe = loadStripe(stripePublicKey);

export const STRIPE_PRICES = {
  monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
  annual: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID || 'price_annual',
};

export async function createCheckoutSession(
  priceId: string,
  userId: string,
  email: string
) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId, email }),
  });
  if (!response.ok) throw new Error('Failed to create checkout session');
  return response.json();
}

export async function createPortalSession(customerId: string) {
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
  });
  if (!response.ok) throw new Error('Failed to create portal session');
  return response.json();
}
