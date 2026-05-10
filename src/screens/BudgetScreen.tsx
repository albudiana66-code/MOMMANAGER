import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/frankfurter';
import type { BudgetTransaction } from '../types';

const CATEGORY_COLORS: Record<BudgetTransaction['category'], string> = {
  food: '#f59e0b',
  transport: '#3b82f6',
  kids: '#E91E8C',
  health: '#ef4444',
  entertainment: '#8b5cf6',
  other: '#6b7280',
};

const LIMIT_KEY = 'mm_budget_limit';
const BUDGET_KEY = (userId: string) => `mm_budget_${userId}`;

function loadTransactions(userId: string): BudgetTransaction[] {
  try {
    const raw = localStorage.getItem(BUDGET_KEY(userId));
    return raw ? (JSON.parse(raw) as BudgetTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveTransactions(userId: string, txs: BudgetTransaction[]) {
  localStorage.setItem(BUDGET_KEY(userId), JSON.stringify(txs));
}

function MonthlyLimitCard({ currency, totalOut }: { currency: string; totalOut: number }) {
  const { t } = useTranslation();
  const [limitStr, setLimitStr] = useState(() => localStorage.getItem(LIMIT_KEY) || '');

  const saveLimit = useCallback((val: string) => {
    setLimitStr(val);
    localStorage.setItem(LIMIT_KEY, val);
  }, []);

  const limit = parseFloat(limitStr) || 0;
  const pct = limit > 0 ? Math.min(100, (totalOut / limit) * 100) : 0;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';

  return (
    <Card className="mx-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">{t('budget.monthlyLimit')}</span>
        {limit > 0 && (
          <span className="text-xs font-semibold" style={{ color }}>
            {formatCurrency(totalOut, currency)} / {formatCurrency(limit, currency)}
          </span>
        )}
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={limitStr}
        onChange={(e) => saveLimit(e.target.value)}
        placeholder={t('budget.limitPlaceholder')}
        className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C]"
      />
      {limit > 0 && (
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </Card>
  );
}

export function BudgetScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency } = useApp();
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'list' | 'chart'>('list');

  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<BudgetTransaction['category']>('other');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const all = loadTransactions(user.id);
    const monthly = all
      .filter((tx) => tx.date >= start && tx.date <= end)
      .sort((a, b) => b.date.localeCompare(a.date));
    setTransactions(monthly);
  }, [user]);

  const { totalIn, totalOut, balance } = useMemo(() => {
    const totalIn = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { totalIn, totalOut, balance: totalIn - totalOut };
  }, [transactions]);

  const chartData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const groups: Record<string, number> = {};
    expenses.forEach((t) => { groups[t.category] = (groups[t.category] || 0) + t.amount; });
    return Object.entries(groups).map(([cat, val]) => ({ name: cat, value: val }));
  }, [transactions]);

  function saveTransaction() {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    const newTx: BudgetTransaction = {
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: parseFloat(amount),
      currency,
      type,
      category,
      description: description.trim() || undefined,
      date,
      created_at: new Date().toISOString(),
    };
    const all = loadTransactions(user.id);
    saveTransactions(user.id, [newTx, ...all]);
    setTransactions((prev) => [newTx, ...prev]);
    setAmount('');
    setDescription('');
    setShowForm(false);
  }

  function deleteTransaction(id: string) {
    if (!user) return;
    const all = loadTransactions(user.id);
    saveTransactions(user.id, all.filter((t) => t.id !== id));
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const categoryOptions = (['food', 'transport', 'kids', 'health', 'entertainment', 'other'] as const).map((c) => ({
    value: c,
    label: t(`budget.${c}`),
  }));
  const typeOptions = [
    { value: 'expense', label: t('budget.expense') },
    { value: 'income', label: t('budget.income') },
  ];

  return (
    <Layout>
      <Header title={t('budget.title')} />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-3">
        {[
          { label: t('budget.totalIn'), value: totalIn, color: '#22c55e' },
          { label: t('budget.totalOut'), value: totalOut, color: '#ef4444' },
          { label: t('budget.balance'), value: balance, color: balance >= 0 ? '#22c55e' : '#ef4444' },
        ].map((s) => (
          <Card key={s.label} className="text-center py-3">
            <div className="text-xs text-[var(--text-secondary)] mb-1">{s.label}</div>
            <div className="text-sm font-bold" style={{ color: s.color }}>
              {formatCurrency(Math.abs(s.value), currency)}
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly limit */}
      <MonthlyLimitCard currency={currency} totalOut={totalOut} />

      {/* Tab bar */}
      <div className="flex mx-4 mt-3 bg-[var(--bg-card)] rounded-2xl p-1 gap-1">
        {(['list', 'chart'] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === tb ? 'bg-[#E91E8C] text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {tb === 'list' ? t('budget.thisMonth') : t('budget.byCategory')}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <div className="px-4 mt-3">
          {transactions.length === 0 ? (
            <p className="text-center text-[var(--text-secondary)] text-sm py-8">{t('budget.noTransactions')}</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-[var(--bg-card)] rounded-2xl p-4 mb-3 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${CATEGORY_COLORS[tx.category]}20` }}
                >
                  {tx.type === 'income' ? '💚' : categoryEmoji(tx.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {tx.description || t(`budget.${tx.category}`)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge color={CATEGORY_COLORS[tx.category]}>{t(`budget.${tx.category}`)}</Badge>
                    <span className="text-xs text-[var(--text-secondary)]">{format(new Date(tx.date + 'T00:00:00'), 'MMM d')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </span>
                  <button onClick={() => deleteTransaction(tx.id)} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5m1.75 0l-.583 7.583a.583.583 0 01-.584.584H4.667a.583.583 0 01-.583-.584L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="px-4 mt-3">
          {chartData.length === 0 ? (
            <p className="text-center text-[var(--text-secondary)] text-sm py-8">{t('budget.noTransactions')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as BudgetTransaction['category']] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(Number(val), currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {chartData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[entry.name as BudgetTransaction['category']] }} />
                      <span className="text-sm text-[var(--text-primary)]">{t(`budget.${entry.name}`)}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(entry.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[#E91E8C] shadow-lg shadow-pink-500/30 flex items-center justify-center text-white text-2xl z-30 active:scale-95 transition-transform"
        aria-label={t('budget.addTransaction')}
      >
        +
      </button>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('budget.addTransaction')}>
        <div className="flex flex-col gap-4">
          <Select label={t('budget.type')} value={type} options={typeOptions} onChange={(e) => setType(e.target.value as 'income' | 'expense')} />
          <Input label={t('budget.amount')} type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <Select label={t('budget.category')} value={category} options={categoryOptions} onChange={(e) => setCategory(e.target.value as BudgetTransaction['category'])} />
          <Input label={t('budget.description')} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('budget.description')} />
          <Input label={t('budget.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('budget.cancel')}</Button>
            <Button className="flex-1" onClick={saveTransaction}>{t('budget.save')}</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

function categoryEmoji(cat: BudgetTransaction['category']): string {
  const map: Record<BudgetTransaction['category'], string> = {
    food: '🍔', transport: '🚗', kids: '👶', health: '💊', entertainment: '🎬', other: '💳',
  };
  return map[cat] || '💳';
}
