import { Capacitor } from '@capacitor/core';
import type { SubscriptionPlan } from '../types';

export type IAPPlan = Exclude<SubscriptionPlan, 'free_trial' | null>;

// ── Apple product IDs — must match exactly what's created in App Store Connect ──
export const APPLE_PRODUCT_IDS: Record<IAPPlan, string> = {
  standard_monthly: 'standard_monthly',
  standard_yearly:  'standard_yearly',
  pro_monthly:      'pro_monthly',
  pro_yearly:       'pro_yearly',
};

// ── Google Play product IDs ──────────────────────────────────────────────────
// Created in Play Console under Monetize → Subscriptions, each with a
// "monthly"/"yearly" base plan and a free-trial-7-days offer. Google Play
// Billing (v5+) identifies a subscription by "productId:basePlanId", not
// just the product ID — RevenueCat's product catalog uses this same format,
// matching what Purchases.getOfferings() returns on Android.
// The Play Console merchant/payments profile is still pending verification
// (see "Setări pentru plăți"), so real purchases won't complete until that's
// resolved — but the product/offering configuration itself is live.
export const GOOGLE_PRODUCT_IDS: Record<IAPPlan, string> = {
  standard_monthly: 'standard_monthly:monthly',
  standard_yearly:  'standard_yearly:yearly',
  pro_monthly:      'pro_monthly:monthly',
  pro_yearly:       'pro_yearly:yearly',
};

export function nativeProductIds(): Record<IAPPlan, string> {
  return Capacitor.getPlatform() === 'ios' ? APPLE_PRODUCT_IDS : GOOGLE_PRODUCT_IDS;
}

// ── RevenueCat package identifiers — the "Subscription" offering ────────────
// These are the actual package identifiers configured in the RevenueCat
// dashboard for that offering, verified on 2026-08-05. They are NOT the
// store product identifiers above — RevenueCat packages are the stable,
// cross-platform lookup key (each package already resolves to the right
// underlying iOS/Android product for whichever store the app is running on),
// while the store product identifiers themselves differ by platform (Android
// carries a ":basePlanId" suffix, iOS doesn't). Always match packages by
// this identifier, never by product.identifier.
export const RC_PACKAGE_IDS: Record<IAPPlan, string> = {
  standard_monthly: 'Custom',
  standard_yearly:  'standard_annual',
  pro_monthly:      '$rc_monthly',
  pro_yearly:       '$rc_annual',
};
