import type { CurrencyRates } from '../types';

const CACHE_KEY = 'mm_currency_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchRates(base = 'GBP'): Promise<CurrencyRates> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed: CurrencyRates = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.base === base) {
      return parsed;
    }
  }

  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${base}&to=RON,EUR,USD,PLN,GBP`
  );
  if (!res.ok) throw new Error('Failed to fetch currency rates');
  const data = await res.json();

  const result: CurrencyRates = {
    base: data.base,
    rates: { ...data.rates, [data.base]: 1 },
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    GBP: '£', RON: 'lei', EUR: '€', USD: '$', PLN: 'zł',
  };
  const sym = symbols[currency] || currency;
  if (currency === 'RON') return `${amount.toFixed(2)} ${sym}`;
  return `${sym}${amount.toFixed(2)}`;
}
