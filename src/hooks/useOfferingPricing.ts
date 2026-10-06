import { useEffect, useState } from 'react';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { ensureRevenueCatConfigured, isNativeMobile } from '../lib/iap';
import { RC_PACKAGE_IDS, type IAPPlan } from '../lib/iapProducts';
import type { NativePlanPrice } from '../lib/pricing';

/**
 * Fetches the current RevenueCat offering once (native platforms only) and
 * exposes each plan's real store-localised price and billing period — the
 * only source of truth the Play Store / App Store review process accepts
 * for trial / pricing disclosures, as opposed to our own hardcoded currency
 * table. Packages are matched by their RevenueCat package identifier (the
 * stable, cross-platform key for the "Subscription" offering), never by
 * store product identifier — see RC_PACKAGE_IDS for why.
 *
 * `loading` stays true until the offering has been fetched (or has
 * definitively failed) so callers can show a skeleton instead of ever
 * rendering a hardcoded placeholder number.
 */
export function useOfferingPricing(): { pricing: Partial<Record<IAPPlan, NativePlanPrice>>; loading: boolean } {
  const [pricing, setPricing] = useState<Partial<Record<IAPPlan, NativePlanPrice>>>({});
  const [loading, setLoading] = useState(isNativeMobile());

  useEffect(() => {
    if (!isNativeMobile()) return;
    let cancelled = false;

    ensureRevenueCatConfigured()
      .then(() => Purchases.getOfferings())
      .then((offerings) => {
        if (cancelled) return;
        const current = offerings.current;
        console.log(
          '[RevenueCat] useOfferingPricing — current offering:', current?.identifier ?? null,
          '— packages:', current?.availablePackages.map((p) => p.identifier) ?? []
        );
        if (!current) return;

        const result: Partial<Record<IAPPlan, NativePlanPrice>> = {};
        (Object.keys(RC_PACKAGE_IDS) as IAPPlan[]).forEach((plan) => {
          const pkg = current.availablePackages.find((p) => p.identifier === RC_PACKAGE_IDS[plan]);
          if (pkg) {
            result[plan] = {
              priceString: pkg.product.priceString,
              price: pkg.product.price,
              currencyCode: pkg.product.currencyCode,
              pricePerMonthString: pkg.product.pricePerMonthString,
              period: plan.endsWith('_yearly') ? 'year' : 'month',
            };
          } else {
            console.error(`[RevenueCat] useOfferingPricing — package not found for ${plan}: expected identifier "${RC_PACKAGE_IDS[plan]}"`);
          }
        });
        setPricing(result);
      })
      .catch((err) => {
        console.error('[RevenueCat] useOfferingPricing — failed to load offerings:', err);
        // Left empty — callers fall back to the Stripe-derived price display.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { pricing, loading };
}
