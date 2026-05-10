import { useState, useEffect } from 'react';
import { fetchRates, formatCurrency } from '../lib/frankfurter';
import type { CurrencyRates } from '../types';

export function useCurrency(base = 'GBP') {
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchRates(base)
      .then(setRates)
      .catch(() => setError('Failed to load rates'))
      .finally(() => setLoading(false));
  }, [base]);

  function convert(amount: number, to: string): number {
    if (!rates) return amount;
    const rate = rates.rates[to];
    if (!rate) return amount;
    return amount * rate;
  }

  return { rates, loading, error, convert, formatCurrency };
}
