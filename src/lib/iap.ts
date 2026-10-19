import { Capacitor } from '@capacitor/core';
import { Purchases, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { nativeProductIds, RC_PACKAGE_IDS, type IAPPlan } from './iapProducts';

export type { IAPPlan };

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// Configures the RevenueCat SDK exactly once and resolves when it's ready.
// main.tsx kicks this off on startup but previously never awaited it before
// rendering — if the paywall mounted on a cold launch (e.g. an already
// signed-in user with no active subscription landing straight on /paywall)
// before configure() finished, calling getOfferings()/purchasePackage()
// first could fail with RevenueCat's own CONFIGURATION_ERROR. Every call
// into `Purchases` below awaits this first so that race can't happen.
let configuredPromise: Promise<void> | null = null;

export function ensureRevenueCatConfigured(): Promise<void> {
  if (!isNativeMobile()) return Promise.resolve();
  if (!configuredPromise) {
    const platform = Capacitor.getPlatform();
    const apiKey = platform === 'ios'
      ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
      : platform === 'android'
        ? import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY
        : undefined;

    if (!apiKey) {
      console.error(`[RevenueCat] Missing API key for platform "${platform}" — check .env`);
      configuredPromise = Promise.resolve();
    } else {
      configuredPromise = Purchases.configure({ apiKey })
        .then(() => {
          console.log('[RevenueCat] configured for platform:', platform);
        })
        .catch((err) => {
          console.error('[RevenueCat] configure failed:', err);
        });
    }
  }
  return configuredPromise;
}

/**
 * Links the signed-in Supabase user to this RevenueCat installation, so
 * RevenueCat's own `app_user_id` on every webhook event (purchase, renewal,
 * cancellation...) is the same uuid as `auth.users.id` / `profiles.id` —
 * without this, the revenuecat-webhook function has no way to know which
 * user an event is about. Configure always starts anonymous (no appUserID
 * is known yet at app boot, before auth has resolved); this call is what
 * actually identifies the user once sign-in completes. Safe to call again
 * with the same id (e.g. on every app resume) — RevenueCat no-ops if
 * already logged in as that user. If the installation was anonymous
 * before this (a trial/purchase started pre-login), RevenueCat transfers
 * that anonymous user's purchase history onto the now-identified id.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!isNativeMobile()) return;
  await ensureRevenueCatConfigured();
  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('[RevenueCat] logIn succeeded for', userId);
  } catch (err) {
    console.error('[RevenueCat] logIn failed:', err);
  }
}

/**
 * Clears the identified RevenueCat user on sign-out, reverting to a fresh
 * anonymous id — otherwise the next person who signs in on this device
 * would inherit the previous user's RevenueCat identity/entitlements.
 */
export async function resetRevenueCatUser(): Promise<void> {
  if (!isNativeMobile()) return;
  await ensureRevenueCatConfigured();
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('[RevenueCat] logOut failed:', err);
  }
}

// How long we wait for the native store sheet (StoreKit / Play Billing) to
// resolve before giving up and letting the UI recover on its own. Real
// purchases normally settle in a couple of seconds, but native promises can
// get stuck — e.g. StoreKit's "Payment Information Required" dialog closing
// without the plugin's completion callback ever firing — so the button must
// never depend solely on the native promise settling.
const NATIVE_PURCHASE_TIMEOUT_MS = 18_000;

export class PurchaseTimeoutError extends Error {
  constructor() {
    super('Native purchase timed out waiting for the store to respond');
    this.name = 'PurchaseTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PurchaseTimeoutError()), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** RevenueCat's PurchasesError.code (a numeric-string enum) if present on this error, else null. */
export function getRevenueCatErrorCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

/**
 * Purchase a subscription via the platform's native store (Apple StoreKit on
 * iOS, Google Play Billing on Android), through the same RevenueCat call on
 * both — RevenueCat itself talks to whichever store the app is running on.
 * Returns true on success, throws on failure/cancellation/timeout.
 */
export async function purchaseNativeSubscription(plan: IAPPlan): Promise<boolean> {
  if (!isNativeMobile()) throw new Error('Native purchases only available in the app');
  await ensureRevenueCatConfigured();

  // Packages are matched by their RevenueCat package identifier, not the
  // store product identifier — the package identifiers are the stable,
  // cross-platform key configured in the "Subscription" offering (each
  // package already resolves to the right underlying iOS/Android product),
  // whereas the store product id itself differs by platform.
  const targetPackageId = RC_PACKAGE_IDS[plan];

  const offerings = await withTimeout(Purchases.getOfferings(), NATIVE_PURCHASE_TIMEOUT_MS);
  const current = offerings.current;
  console.log(
    '[RevenueCat] current offering:', current?.identifier ?? null,
    '— packages:', current?.availablePackages.map((p) => p.identifier) ?? []
  );
  if (!current) throw new Error('No offerings available');

  const pkg: PurchasesPackage | undefined = current.availablePackages.find(
    (p) => p.identifier === targetPackageId
  );

  if (!pkg) throw new Error(`Package not found: ${targetPackageId}`);

  const { customerInfo } = await withTimeout(
    Purchases.purchasePackage({ aPackage: pkg }),
    NATIVE_PURCHASE_TIMEOUT_MS
  );

  const entitlements = customerInfo?.entitlements?.active ?? {};
  return Object.keys(entitlements).length > 0;
}

/**
 * Restore previous native purchases (Apple or Google Play, whichever store
 * the app is running on). Returns the restored plan so the caller can
 * confirm it server-side, or null if nothing active was found.
 */
export async function restoreNativePurchases(): Promise<IAPPlan | null> {
  if (!isNativeMobile()) return null;
  await ensureRevenueCatConfigured();

  const { customerInfo } = await withTimeout(Purchases.restorePurchases(), NATIVE_PURCHASE_TIMEOUT_MS);
  const entitlements = Object.values(customerInfo?.entitlements?.active ?? {});
  if (entitlements.length === 0) return null;

  const productId = entitlements[0].productIdentifier;
  const productIds = nativeProductIds();
  const plan = (Object.keys(productIds) as IAPPlan[]).find((p) => productIds[p] === productId);
  return plan ?? null;
}

export interface OfferingDebugEntry {
  packageIdentifier: string;
  productIdentifier: string;
  priceString: string;
  currencyCode: string;
}

/**
 * Fetches the current RevenueCat offering and returns each package's raw
 * product id, store-formatted price string, and ISO currency code — the
 * same fields `useOfferingPricing` uses to render the paywall, exposed here
 * as a standalone call so the debug panel (and this console log) can prove
 * what the store is actually returning on a given device, independent of
 * whatever the paywall itself is currently rendering.
 */
export async function fetchOfferingsDebugInfo(): Promise<OfferingDebugEntry[]> {
  if (!isNativeMobile()) return [];
  await ensureRevenueCatConfigured();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const entries: OfferingDebugEntry[] = (current?.availablePackages ?? []).map((p) => ({
    packageIdentifier: p.identifier,
    productIdentifier: p.product.identifier,
    priceString: p.product.priceString,
    currencyCode: p.product.currencyCode,
  }));
  console.log('[RevenueCat] offerings debug —', current?.identifier ?? 'no current offering', entries);
  return entries;
}

/**
 * Buckets a thrown purchase/restore error into the categories the paywall UI
 * needs to react to differently — silent for a deliberate cancel, an
 * actionable message for everything else. Based on RevenueCat's
 * PURCHASES_ERROR_CODE where available, falling back to message sniffing for
 * errors that don't carry one (e.g. our own timeout, or a plain network throw).
 */
export type PurchaseErrorKind =
  | 'cancelled'
  | 'noPaymentMethod'
  | 'notAllowed'
  | 'network'
  | 'timeout'
  | 'pending'
  | 'unknown';

export function classifyPurchaseError(err: unknown): PurchaseErrorKind {
  if (err instanceof PurchaseTimeoutError) return 'timeout';

  switch (getRevenueCatErrorCode(err)) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return 'cancelled';
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'notAllowed';
    // RevenueCat reports this when the store itself rejects the purchase
    // attempt (commonly: no valid payment method on the Apple/Google account).
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return 'noPaymentMethod';
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return 'pending';
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR:
      return 'network';
    default:
      break;
  }

  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('cancel')) return 'cancelled';
  if (msg.includes('network') || msg.includes('offline') || msg.includes('internet')) return 'network';
  return 'unknown';
}
