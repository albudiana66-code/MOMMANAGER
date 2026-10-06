import { describe, expect, it } from 'vitest';
import { billedYearlySubtitle, formatMonthlyEquivalent, priceLabel, type NativePlanPrice } from './pricing';

function yearlyPlan(overrides: Partial<NativePlanPrice> = {}): NativePlanPrice {
  return {
    priceString: '£39.99',
    price: 39.99,
    currencyCode: 'GBP',
    pricePerMonthString: null,
    period: 'year',
    ...overrides,
  };
}

function monthlyPlan(overrides: Partial<NativePlanPrice> = {}): NativePlanPrice {
  return {
    priceString: '£4.99',
    price: 4.99,
    currencyCode: 'GBP',
    pricePerMonthString: null,
    period: 'month',
    ...overrides,
  };
}

describe('priceLabel', () => {
  it('labels a yearly plan with "year" and never "/mo"', () => {
    const label = priceLabel(yearlyPlan());
    expect(label).toContain('year');
    expect(label).not.toContain('/mo');
    expect(label).toBe('£39.99 / year');
  });

  it('labels a monthly plan with "month"', () => {
    const label = priceLabel(monthlyPlan());
    expect(label).toBe('£4.99 / month');
  });
});

describe('formatMonthlyEquivalent', () => {
  it('derives £3.33/month from a £39.99/yr plan, rounded down to 2 decimals', () => {
    expect(formatMonthlyEquivalent(yearlyPlan({ priceString: '£39.99', price: 39.99 }))).toBe('£3.33');
  });

  it('derives £4.99/month from a £59.99/yr plan, rounded down to 2 decimals', () => {
    expect(formatMonthlyEquivalent(yearlyPlan({ priceString: '£59.99', price: 59.99 }))).toBe('£4.99');
  });

  it('prefers the SDK-provided pricePerMonthString when present', () => {
    expect(formatMonthlyEquivalent(yearlyPlan({ pricePerMonthString: '£3.34' }))).toBe('£3.34');
  });

  it('formats using the product currencyCode, not a hardcoded currency', () => {
    expect(formatMonthlyEquivalent(yearlyPlan({ priceString: '$39.99', price: 39.99, currencyCode: 'USD' }))).toBe('$3.33');
    expect(formatMonthlyEquivalent(yearlyPlan({ priceString: '€39.99', price: 39.99, currencyCode: 'EUR' }))).toContain('3.33');
    expect(formatMonthlyEquivalent(yearlyPlan({ priceString: '€39.99', price: 39.99, currencyCode: 'EUR' }))).toContain('€');
  });
});

describe('billedYearlySubtitle', () => {
  it('reads "Just {perMonth} / month, billed yearly" and never says "/mo"', () => {
    const subtitle = billedYearlySubtitle(yearlyPlan({ priceString: '£39.99', price: 39.99 }));
    expect(subtitle).toBe('Just £3.33 / month, billed yearly');
    expect(subtitle).not.toContain('/mo');
  });
});
