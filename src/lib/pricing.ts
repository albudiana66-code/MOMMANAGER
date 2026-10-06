// Single source of truth for formatting native (RevenueCat / App Store /
// Google Play) subscription prices across the paywall, settings, and any
// other surface that shows a plan's price.
//
// Every number shown to the user comes from the store's own offering data
// (product.priceString / product.price / product.currencyCode) at runtime —
// never a hardcoded amount or currency symbol. This is what Apple/Google
// review actually checks: a yearly plan's headline price is the real billed
// (annual) amount, and if a monthly-equivalent is shown it's clearly labelled
// as such and never suffixed "/mo" next to the annual figure.

export type BillingPeriod = 'month' | 'year';

export interface NativePlanPrice {
  /** Store-formatted, localised full price string, e.g. "£39.99" — straight from product.priceString. Never assembled from a hardcoded currency symbol. */
  priceString: string;
  /** Raw numeric price matching priceString, e.g. 39.99 — product.price. */
  price: number;
  /** ISO 4217 currency code from product.currencyCode, e.g. "GBP". */
  currencyCode: string;
  /** Store-formatted monthly-equivalent price (product.pricePerMonthString). Null when the store doesn't provide one. */
  pricePerMonthString: string | null;
  /** Billing period this price bills for. */
  period: BillingPeriod;
}

/**
 * The monthly-equivalent amount for a yearly plan, store-formatted. Prefers
 * the SDK's own pricePerMonthString; falls back to price/12 rounded DOWN to
 * 2 decimals (so we never round up and overstate the monthly saving), then
 * formats it with Intl.NumberFormat using the product's own currency code —
 * never a hardcoded "£".
 */
export function formatMonthlyEquivalent(plan: NativePlanPrice): string {
  if (plan.pricePerMonthString) return plan.pricePerMonthString;
  const perMonth = Math.floor((plan.price / 12) * 100) / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: plan.currencyCode,
  }).format(perMonth);
}

/**
 * The big headline price label for a plan card.
 *  - Monthly: "{priceString} / month"
 *  - Yearly:  "{priceString} / year"   — the full billed amount, never "/mo".
 */
export function priceLabel(plan: NativePlanPrice): string {
  return plan.period === 'year'
    ? `${plan.priceString} / year`
    : `${plan.priceString} / month`;
}

/**
 * The smaller subtitle shown under a yearly plan's headline price:
 * "Just {perMonth} / month, billed yearly". Never call this for a monthly
 * plan — there's nothing to break out per month.
 */
export function billedYearlySubtitle(plan: NativePlanPrice): string {
  return `Just ${formatMonthlyEquivalent(plan)} / month, billed yearly`;
}

/** Translated unit ("month" / "year") matching this plan's billing period, for the trial-disclosure sentence. */
export function periodWord(plan: NativePlanPrice, words: { month: string; year: string }): string {
  return plan.period === 'year' ? words.year : words.month;
}
