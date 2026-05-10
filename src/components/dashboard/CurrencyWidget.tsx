import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

const CURRENCY_LIST = ['GBP', 'RON', 'EUR', 'USD', 'PLN'];
const SYMBOLS: Record<string, string> = { GBP: '£', RON: 'lei', EUR: '€', USD: '$', PLN: 'zł' };

export function CurrencyWidget() {
  const { t } = useTranslation();
  const { currency } = useApp();
  const { rates, loading, convert } = useCurrency(currency);
  const [amount, setAmount] = useState('1');

  const num = parseFloat(amount) || 0;

  return (
    <Card className="mx-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">
          {t('dashboard.currencyConverter')}
        </h3>
        {rates && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            {t('dashboard.ratesUpdated')}
          </span>
        )}
      </div>

      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="1"
        className="mb-3"
      />

      {loading ? (
        <div className="text-center text-[var(--text-secondary)] text-sm py-2">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {CURRENCY_LIST.filter((c) => c !== currency).map((c) => (
            <div key={c} className="bg-[var(--bg-primary)] rounded-xl px-3 py-2">
              <div className="text-[10px] text-[var(--text-secondary)]">{c}</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {SYMBOLS[c]}{convert(num, c).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
