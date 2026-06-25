import { Capacitor } from '@capacitor/core';
import type { Package } from '@capgo/capacitor-purchases';

// Apple product IDs — must match exactly what you create in App Store Connect
export const APPLE_PRODUCT_IDS = {
  standard_monthly: 'com.soldoutdigital.mommanager.standard.monthly',
  standard_yearly:  'com.soldoutdigital.mommanager.standard.yearly',
  pro_monthly:      'com.soldoutdigital.mommanager.pro.monthly',
  pro_yearly:       'com.soldoutdigital.mommanager.pro.yearly',
} as const;

export type IAPPlan = keyof typeof APPLE_PRODUCT_IDS;

export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Purchase a subscription via Apple StoreKit (iOS only).
 * Uses RevenueCat offerings API via @capgo/capacitor-purchases.
 * Returns true on success, throws on failure/cancellation.
 */
export async function purchaseAppleSubscription(plan: IAPPlan): Promise<boolean> {
  if (!isNativeIOS()) throw new Error('Apple IAP only available on iOS');

  const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
  const targetProductId = APPLE_PRODUCT_IDS[plan];

  // Fetch all offerings from RevenueCat
  const { offerings } = await CapacitorPurchases.getOfferings();
  const current = offerings?.current;
  if (!current) throw new Error('No offerings available');

  // Find the package whose underlying product matches our target product ID
  const pkg: Package | undefined = current.availablePackages.find(
    (p: Package) => p.product.identifier === targetProductId
  );

  if (!pkg) throw new Error(`Product not found: ${targetProductId}`);

  const { customerInfo } = await CapacitorPurchases.purchasePackage({
    identifier: pkg.identifier,
    offeringIdentifier: pkg.offeringIdentifier,
  });

  const entitlements = customerInfo?.entitlements?.active ?? {};
  return Object.keys(entitlements).length > 0;
}

/**
 * Restore previous Apple purchases.
 */
export async function restoreApplePurchases(): Promise<boolean> {
  if (!isNativeIOS()) return false;

  const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
  const { customerInfo } = await CapacitorPurchases.restorePurchases();
  const entitlements = customerInfo?.entitlements?.active ?? {};
  return Object.keys(entitlements).length > 0;
}
