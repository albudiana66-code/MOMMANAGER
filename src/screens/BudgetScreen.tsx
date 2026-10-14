import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, getDaysInMonth, getDate, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/frankfurter';
import { getErrorMessage } from '../lib/errors';
import { ProGate } from '../components/paywall/ProGate';
import { useDateFnsLocale } from '../hooks/useDateFnsLocale';
import i18n from '../i18n';
import type { BudgetTransaction } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type BudgetTab = 'overview' | 'transactions' | 'accounts';
type TxCategory = BudgetTransaction['category'];

type Account = {
  id: string;
  name: string;
  type: 'cash' | 'current' | 'savings' | 'credit';
  balance: number;
  color: string;
  createdAt: string;
};

type BudgetLimits = Partial<Record<TxCategory, number>>;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const TX_KEY = (uid: string) => `mm_transactions_${uid}`;
const ACCOUNTS_KEY = (uid: string) => `mm_accounts_${uid}`;
const BUDGETS_KEY = (uid: string) => `mm_budgets_${uid}`;
const MONTHLY_BUDGET_KEY = (uid: string) => `mm_monthly_budget_${uid}`;
// legacy key migration
const LEGACY_KEY = (uid: string) => `mm_budget_${uid}`;

type CatMeta = { labelKey: string; emoji: string; color: string };
const CATEGORIES: Record<TxCategory, CatMeta> = {
  groceries:    { labelKey: 'budget.categories.groceries',    emoji: '🛒', color: '#8FA888' },
  food:         { labelKey: 'budget.categories.groceries',    emoji: '🛒', color: '#8FA888' }, // legacy alias
  housing:      { labelKey: 'budget.categories.housing',      emoji: '🏠', color: '#C4B8D8' },
  transport:    { labelKey: 'budget.categories.transport',    emoji: '🚗', color: '#E8B89A' },
  eating_out:   { labelKey: 'budget.categories.eatingOut',    emoji: '🍽️', color: '#D4AF37' },
  shopping:     { labelKey: 'budget.categories.shopping',     emoji: '👗', color: '#C4788A' },
  kids:         { labelKey: 'budget.categories.kids',         emoji: '🧒', color: '#9B6B8A' },
  health:       { labelKey: 'budget.categories.health',       emoji: '💊', color: '#60A5FA' },
  entertainment:{ labelKey: 'budget.categories.entertainment',emoji: '🎮', color: '#FB923C' },
  savings:      { labelKey: 'budget.categories.savings',      emoji: '💰', color: '#34D399' },
  other:        { labelKey: 'budget.categories.other',        emoji: '📦', color: '#94A3B8' },
};
function catLabel(cat: TxCategory): string { return i18n.t(CATEGORIES[cat]?.labelKey ?? CATEGORIES.other.labelKey); }

// canonical categories shown in UI (no 'food' legacy)
const CAT_KEYS: TxCategory[] = [
  'groceries','housing','transport','eating_out','shopping',
  'kids','health','entertainment','savings','other',
];

const ACCOUNT_COLORS = ['#C4788A','#8FA888','#C4B8D8','#E8B89A','#60A5FA','#D4AF37'];
const ACCOUNT_TYPE_ICONS: Record<Account['type'], string> = {
  cash: '💵', current: '🏦', savings: '💰', credit: '💳',
};

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────

function loadTx(uid: string): BudgetTransaction[] {
  try {
    // migrate legacy key
    const legacy = localStorage.getItem(LEGACY_KEY(uid));
    const current = localStorage.getItem(TX_KEY(uid));
    if (legacy && !current) {
      localStorage.setItem(TX_KEY(uid), legacy);
      localStorage.removeItem(LEGACY_KEY(uid));
      return JSON.parse(legacy);
    }
    return current ? JSON.parse(current) : [];
  } catch { return []; }
}
function saveTx(uid: string, txs: BudgetTransaction[]) { localStorage.setItem(TX_KEY(uid), JSON.stringify(txs)); }

function loadAccounts(uid: string): Account[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY(uid)) || '[]'); } catch { return []; }
}
function saveAccounts(uid: string, accs: Account[]) { localStorage.setItem(ACCOUNTS_KEY(uid), JSON.stringify(accs)); }

function loadBudgets(uid: string): BudgetLimits {
  try { return JSON.parse(localStorage.getItem(BUDGETS_KEY(uid)) || '{}'); } catch { return {}; }
}
function saveBudgets(uid: string, b: BudgetLimits) { localStorage.setItem(BUDGETS_KEY(uid), JSON.stringify(b)); }
function loadMonthlyBudget(uid: string): number { return parseFloat(localStorage.getItem(MONTHLY_BUDGET_KEY(uid)) || '0') || 0; }
function saveMonthlyBudget(uid: string, v: number) { localStorage.setItem(MONTHLY_BUDGET_KEY(uid), String(v)); }

// ─────────────────────────────────────────────
// SVG Donut Chart
// ─────────────────────────────────────────────

type Slice = { category: TxCategory; amount: number; pct: number };

function DonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  const SIZE = 180;
  const R = 70;
  const STROKE = 22;
  const circ = 2 * Math.PI * R;
  const [hovered, setHovered] = useState<TxCategory | null>(null);

  // Prefix-sum of each slice's starting percentage, computed up front so the
  // map below stays a pure per-item transform (no running-total mutation).
  const cumulativeStarts = slices.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + slices[i - 1].pct);
    return acc;
  }, []);
  const arcs = slices.map((s, i) => {
    const dash = (s.pct / 100) * circ;
    const offset = circ - cumulativeStarts[i] * circ / 100;
    return { ...s, dash, offset };
  });

  const hoveredSlice = slices.find(s => s.category === hovered);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          {arcs.length === 0 ? (
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          ) : (
            arcs.map(arc => (
              <circle key={arc.category}
                cx={SIZE/2} cy={SIZE/2} r={R}
                fill="none"
                stroke={CATEGORIES[arc.category]?.color || '#94A3B8'}
                strokeWidth={hovered === arc.category ? STROKE + 4 : STROKE}
                strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-width 0.15s', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(arc.category)}
                onMouseLeave={() => setHovered(null)}
              />
            ))
          )}
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {hoveredSlice ? (
            <>
              <span style={{ fontSize: 18 }}>{CATEGORIES[hoveredSlice.category]?.emoji}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>
                {catLabel(hoveredSlice.category)}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{hoveredSlice.pct.toFixed(0)}%</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{i18n.t('budget.totalSpent')}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(total, 'GBP').replace(/[£$€]/,'')}</p>
            </>
          )}
        </div>
      </div>
      {/* Legend */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slices.slice(0, 6).map(s => (
          <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={() => setHovered(s.category)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: CATEGORIES[s.category]?.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {catLabel(s.category)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────

function OverviewTab({ txs, budgets, saveBudgetsLocal, monthlyBudget, saveMonthlyBudgetLocal, currency, currentMonth, setCurrentMonth }:
  { txs: BudgetTransaction[]; budgets: BudgetLimits; saveBudgetsLocal: (b: BudgetLimits) => void; monthlyBudget: number; saveMonthlyBudgetLocal: (v: number) => void; currency: string; currentMonth: Date; setCurrentMonth: (d: Date) => void }) {

  const dateLocale = useDateFnsLocale();
  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  // Memoized with a referentially-stable result so the catTotals useMemo
  // below (keyed on this) can actually skip recomputation across renders.
  const monthTxs = useMemo(
    () => txs.filter(t => t.date >= monthStart && t.date <= monthEnd),
    [txs, monthStart, monthEnd]
  );

  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Category totals (merge 'food' into 'groceries')
  const catTotals = useMemo<Partial<Record<TxCategory, number>>>(() => {
    const m: Partial<Record<TxCategory, number>> = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key: TxCategory = t.category === 'food' ? 'groceries' : t.category;
      m[key] = (m[key] || 0) + t.amount;
    });
    return m;
  }, [monthTxs]);

  const slices: Slice[] = Object.entries(catTotals)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => ({ category: k as TxCategory, amount: v!, pct: totalExpense > 0 ? (v! / totalExpense) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Quick stats
  const daysInMonth = getDaysInMonth(currentMonth);
  const dayElapsed = getDate(new Date()) > 0 && format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
    ? Math.max(1, getDate(new Date()))
    : daysInMonth;
  const avgDaily = dayElapsed > 0 ? totalExpense / dayElapsed : 0;
  const projected = avgDaily * daysInMonth;
  const daysLeft = daysInMonth - dayElapsed;

  const biggestTx = monthTxs.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];

  const [editingBudget, setEditingBudget] = useState<TxCategory | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState('');

  function saveBudgetLimit(cat: TxCategory) {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      saveBudgetsLocal({ ...budgets, [cat]: val });
    } else {
      const updated = { ...budgets };
      delete updated[cat];
      saveBudgetsLocal(updated);
    }
    setEditingBudget(null);
  }

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-24">
      {/* Month selector + summary */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}</p>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 12, letterSpacing: '0.02em' }}>
          {i18n.t('budget.resetsMonthlyNote')}
        </p>

        {/* Big number */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{i18n.t('budget.totalSpent')}</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {formatCurrency(totalExpense, currency)}
          </p>
        </div>

        {/* Income/Expense pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, borderRadius: 14, padding: '10px 12px', background: 'var(--sage-soft)' }}>
            <p style={{ fontSize: 10, color: '#8FA888', fontWeight: 600, marginBottom: 2 }}>↑ {i18n.t('budget.incomeLabel')}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#8FA888' }}>{formatCurrency(totalIncome, currency)}</p>
          </div>
          <div style={{ flex: 1, borderRadius: 14, padding: '10px 12px', background: 'var(--accent-soft)' }}>
            <p style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>↓ {i18n.t('budget.expensesLabel')}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(totalExpense, currency)}</p>
          </div>
        </div>

        {/* Monthly budget input + progress bar */}
        <div style={{ marginTop: 4 }}>
          {editingMonthly ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={monthlyInput}
                onChange={e => setMonthlyInput(e.target.value)}
                placeholder={i18n.t('budget.enterMonthlyBudgetPlaceholder')}
                autoFocus
                style={{ flex: 1, height: 40, borderRadius: 12, border: '1.5px solid var(--accent)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 15, padding: '0 12px', outline: 'none' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = parseFloat(monthlyInput);
                    if (!isNaN(v) && v > 0) saveMonthlyBudgetLocal(v);
                    setEditingMonthly(false);
                  }
                  if (e.key === 'Escape') setEditingMonthly(false);
                }}
              />
              <button
                onClick={() => {
                  const v = parseFloat(monthlyInput);
                  if (!isNaN(v) && v > 0) saveMonthlyBudgetLocal(v);
                  setEditingMonthly(false);
                }}
                style={{ height: 40, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >{i18n.t('budget.save')}</button>
              <button onClick={() => setEditingMonthly(false)}
                style={{ height: 40, padding: '0 10px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setMonthlyInput(monthlyBudget > 0 ? String(monthlyBudget) : ''); setEditingMonthly(true); }}
              style={{ width: '100%', height: 40, borderRadius: 12, border: '1.5px dashed var(--border)', background: 'transparent', color: monthlyBudget > 0 ? 'var(--text-secondary)' : 'var(--accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {monthlyBudget > 0
                ? i18n.t('budget.monthlyBudgetPrefix', { amount: formatCurrency(monthlyBudget, currency) })
                : i18n.t('budget.setMonthlyBudget')}
            </button>
          )}
          {monthlyBudget > 0 && !editingMonthly && (() => {
            const pct = Math.min((totalExpense / monthlyBudget) * 100, 100);
            const over = totalExpense > monthlyBudget;
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#8FA888';
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{i18n.t('budget.totalBudgetLabel')}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: over ? '#ef4444' : 'var(--text-primary)' }}>
                    {formatCurrency(totalExpense, currency)} / {formatCurrency(monthlyBudget, currency)}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: barColor, transition: 'width 0.4s' }} />
                </div>
                <p style={{ fontSize: 11, marginTop: 5, color: over ? '#ef4444' : '#8FA888', fontWeight: 500 }}>
                  {over
                    ? i18n.t('budget.overBudgetBy', { amount: formatCurrency(totalExpense - monthlyBudget, currency) })
                    : i18n.t('budget.remainingSuffix', { amount: formatCurrency(monthlyBudget - totalExpense, currency) })}
                </p>
              </div>
            );
          })()}</div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: i18n.t('budget.biggestExpense'), value: biggestTx ? formatCurrency(biggestTx.amount, currency) : '—', sub: biggestTx ? catLabel(biggestTx.category as TxCategory) : '' },
          { label: i18n.t('budget.dailyAverage'), value: formatCurrency(avgDaily, currency), sub: i18n.t('budget.perDay') },
          { label: i18n.t('budget.projected'), value: formatCurrency(projected, currency), sub: i18n.t('budget.daysLeftSuffix', { days: daysLeft }) },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '12px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.2 }}>{s.label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Donut chart */}
      {slices.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{i18n.t('budget.spendingByCategory')}</p>
          <DonutChart slices={slices} total={totalExpense} />
        </div>
      )}

      {/* Category budget limits — full list with progress bars */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{i18n.t('budget.budgetByCategoryHeading')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CAT_KEYS.map(cat => {
            const spent = catTotals[cat] || 0;
            const limit = budgets[cat] || 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const over = limit > 0 && spent > limit;
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : CATEGORIES[cat].color;
            const meta = CATEGORIES[cat];
            const isEditing = editingBudget === cat;
            return (
              <div key={cat}>
                {/* Row: emoji + name + spent/limit + edit button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: limit > 0 ? 6 : 2 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {meta.emoji}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: spent > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {catLabel(cat)}
                  </span>
                  {limit > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: over ? '#ef4444' : 'var(--text-secondary)' }}>
                      {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
                    </span>
                  )}
                  {!limit && spent > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatCurrency(spent, currency)}</span>
                  )}
                  <button
                    onClick={() => { setEditingBudget(isEditing ? null : cat); setBudgetInput(budgets[cat]?.toString() || ''); }}
                    style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border)', background: isEditing ? 'var(--accent-soft)' : 'var(--bg-primary)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ✏️
                  </button>
                </div>

                {/* Progress bar */}
                {limit > 0 && (
                  <>
                    <div style={{ height: 7, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: barColor, transition: 'width 0.4s' }} />
                    </div>
                    <p style={{ fontSize: 11, color: over ? '#ef4444' : '#8FA888', fontWeight: 500 }}>
                      {over
                        ? i18n.t('budget.overBudgetBy', { amount: formatCurrency(spent - limit, currency) })
                        : i18n.t('budget.remainingSuffix', { amount: formatCurrency(limit - spent, currency) })}
                    </p>
                  </>
                )}

                {/* Inline edit input */}
                {isEditing && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                      type="number" inputMode="decimal" placeholder={i18n.t('budget.setCategoryLimitPlaceholder', { category: catLabel(cat) })}
                      autoFocus
                      style={{ flex: 1, borderRadius: 10, padding: '8px 10px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                    <button onClick={() => saveBudgetLimit(cat)}
                      style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                      {i18n.t('budget.save')}
                    </button>
                    <button onClick={() => setEditingBudget(null)}
                      style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12 }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD TRANSACTION SHEET
// ─────────────────────────────────────────────

function AddTransactionSheet({ onClose, onSave, accounts, currency }:
  { onClose: () => void; onSave: (tx: Omit<BudgetTransaction, 'id' | 'user_id' | 'created_at'>) => void; accounts: Account[]; currency: string }) {

  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<TxCategory>('groceries');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');

  function handleSave() {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    onSave({ amount: a, currency, type: txType, category, description: description.trim() || undefined, date, account_id: accountId || undefined });
    onClose();
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51, background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: `20px 16px max(calc(env(safe-area-inset-bottom, 0px) + 16px), 56px)`, maxHeight: '92vh', overflowY: 'auto' }}>

        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>{i18n.t('budget.addTransaction')}</p>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-primary)', borderRadius: 14, padding: 4 }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => setTxType(t)} style={{
              flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600,
              background: txType === t ? (t === 'expense' ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'linear-gradient(135deg, #8FA888 0%, #6B9462 100%)') : 'transparent',
              color: txType === t ? '#fff' : 'var(--text-secondary)',
            }}>{t === 'expense' ? `↓ ${i18n.t('budget.expense')}` : `↑ ${i18n.t('budget.income')}`}</button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 300, color: 'var(--text-secondary)' }}>£</span>
            <input value={amount} onChange={e => setAmount(e.target.value)}
              type="number" inputMode="decimal" placeholder="0.00"
              style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', width: 180, textAlign: 'center' }} />
          </div>
        </div>

        {/* Category grid */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{i18n.t('budget.category')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {CAT_KEYS.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px',
              borderRadius: 14, border: '2px solid',
              borderColor: category === cat ? CATEGORIES[cat].color : 'transparent',
              background: category === cat ? CATEGORIES[cat].color + '20' : 'var(--bg-primary)',
            }}>
              <span style={{ fontSize: 18 }}>{CATEGORIES[cat].emoji}</span>
              <span style={{ fontSize: 9, color: category === cat ? CATEGORIES[cat].color : 'var(--text-secondary)', fontWeight: category === cat ? 600 : 400, lineHeight: 1.2, textAlign: 'center' }}>
                {catLabel(cat)}
              </span>
            </button>
          ))}
        </div>

        {/* Description */}
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder={i18n.t('budget.descriptionOptionalPlaceholder')}
          style={{ width: '100%', borderRadius: 14, padding: '12px 14px', fontSize: 14, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }} />

        {/* Date + Account row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{i18n.t('budget.date')}</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', borderRadius: 12, padding: '9px 10px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          {accounts.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{i18n.t('budget.accountLabel')}</p>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}
                style={{ width: '100%', borderRadius: 12, padding: '9px 10px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="">{i18n.t('budget.anyOption')}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, var(--accent-gold, #D4AF37) 0%, #B8935A 100%)',
            color: '#fff', fontWeight: 700, fontSize: 16, opacity: amount && parseFloat(amount) > 0 ? 1 : 0.5,
          }}>
          {i18n.t('budget.saveTransactionBtn')}
        </button>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────
// TRANSACTIONS TAB
// ─────────────────────────────────────────────

function TransactionsTab({ txs, accounts, onDelete, onAdd, currency, currentMonth }:
  { txs: BudgetTransaction[]; accounts: Account[]; onDelete: (id: string) => void; onAdd: () => void; currency: string; currentMonth: Date }) {

  const dateLocale = useDateFnsLocale();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<TxCategory | ''>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    let list = txs.filter(t => t.date >= monthStart && t.date <= monthEnd);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.description || '').toLowerCase().includes(q) || catLabel(t.category).toLowerCase().includes(q));
    }
    if (filterCat) list = list.filter(t => t.category === filterCat || (filterCat === 'groceries' && t.category === 'food'));
    if (sortBy === 'newest') list = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    else if (sortBy === 'oldest') list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    else list = [...list].sort((a, b) => b.amount - a.amount);
    return list;
  }, [txs, search, filterCat, sortBy, monthStart, monthEnd]);

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, BudgetTransaction[]>();
    filtered.forEach(t => {
      const g = map.get(t.date) || [];
      g.push(t);
      map.set(t.date, g);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function dateLabel(d: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (d === today) return i18n.t('budget.today');
    if (d === yesterday) return i18n.t('budget.yesterday');
    return format(new Date(d + 'T00:00:00'), 'EEEE, d MMM', { locale: dateLocale });
  }

  function accountName(id?: string) {
    return id ? (accounts.find(a => a.id === id)?.name || '') : '';
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Search + filters */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 12px', marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={i18n.t('budget.searchTransactionsPlaceholder')}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
          {[{ label: i18n.t('budget.allFilter'), val: '' }, ...CAT_KEYS.slice(0, 6).map(k => ({ label: CATEGORIES[k].emoji + ' ' + catLabel(k), val: k }))].map(f => (
            <button key={f.val} onClick={() => setFilterCat(f.val as TxCategory | '')}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                background: filterCat === f.val ? 'linear-gradient(135deg, var(--sage) 0%, #6B9462 100%)' : 'var(--bg-card)',
                color: filterCat === f.val ? '#fff' : 'var(--text-secondary)', border: filterCat === f.val ? 'none' : '1px solid var(--border)' }}>
              {f.label || i18n.t('budget.allFilter')}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', outline: 'none' }}>
            <option value="newest">{i18n.t('budget.sortNewest')}</option>
            <option value="oldest">{i18n.t('budget.sortOldest')}</option>
            <option value="amount">{i18n.t('budget.sortByAmount')}</option>
          </select>
        </div>
      </div>

      {/* Transaction groups */}
      <div style={{ padding: '8px 16px 0' }}>
        {groups.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, padding: '40px 0' }}>{i18n.t('budget.noTransactionsFound')}</p>
        ) : (
          groups.map(([date, items]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dateLabel(date)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(tx => {
                  const meta = CATEGORIES[tx.category] || CATEGORIES.other;
                  const acc = accountName(tx.account_id);
                  return (
                    <div key={tx.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
                      {/* Swipe delete background */}
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: '#ef4444', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </div>
                      <motion.div
                        drag="x" dragConstraints={{ left: -80, right: 0 }}
                        onDragEnd={(_, info) => { if (info.offset.x < -60) onDelete(tx.id); }}
                        style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 14, background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {meta.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tx.description || catLabel(tx.category)}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 10, background: meta.color + '20', color: meta.color, borderRadius: 8, padding: '2px 6px', fontWeight: 600 }}>{catLabel(tx.category)}</span>
                            {acc && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{acc}</span>}
                          </div>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: tx.type === 'income' ? '#8FA888' : 'var(--accent)', flexShrink: 0 }}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={onAdd} style={{
        position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 20,
        background: 'linear-gradient(135deg, var(--accent-gold, #D4AF37) 0%, #B8935A 100%)',
        border: 'none', color: '#fff', fontSize: 26, fontWeight: 300, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// CSV IMPORT HELPERS
// ─────────────────────────────────────────────

type ParsedRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: TxCategory;
};

function parseCSVText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  return lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { row.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
      else { current += ch; }
    }
    row.push(current.trim().replace(/^"|"$/g, ''));
    return row;
  });
}

type BankFormat = 'monzo' | 'revolut' | 'uk_debit_credit' | 'generic';

function detectBankFormat(headers: string[]): BankFormat {
  const h = headers.map(s => s.toLowerCase().replace(/[^a-z ]/g, '').trim());
  if (h.some(x => x === 'emoji') || h.some(x => x.includes('local amount'))) return 'monzo';
  if (h.some(x => x.includes('started date') || x.includes('completed date'))) return 'revolut';
  if (h.some(x => x.includes('debit') || x.includes('credit amount'))) return 'uk_debit_credit';
  return 'generic';
}

function detectBankName(headers: string[]): string {
  const h = headers.map(s => s.toLowerCase());
  if (h.some(x => x.includes('emoji') || x.includes('local amount'))) return 'Monzo';
  if (h.some(x => x.includes('started date') || x.includes('completed date'))) return 'Revolut';
  return i18n.t('budget.yourBank');
}

function normaliseDate(raw: string): string {
  if (!raw) return format(new Date(), 'yyyy-MM-dd');
  // Try ISO yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // Try dd/MM/yyyy or d/M/yyyy
  const dm = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dm) {
    const y = dm[3].length === 2 ? '20' + dm[3] : dm[3];
    return `${y}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
  }
  // Try MM/dd/yyyy (US format)
  return format(new Date(), 'yyyy-MM-dd');
}

function autoCategory(desc: string): TxCategory {
  const d = desc.toUpperCase();
  if (/TESCO|SAINSBURY|ASDA|LIDL|ALDI|MORRISONS|WAITROSE|COOP|CO-OP|M&S FOOD|MARKS SPENCER/.test(d)) return 'groceries';
  if (/AMAZON|EBAY|ASOS|H&M|ZARA|PRIMARK|NEXT |JOHN LEWIS|ARGOS/.test(d)) return 'shopping';
  if (/\bBP\b|SHELL|ESSO|PETROL|FUEL|PARKING|TFL|TRAINLINE|NATIONAL RAIL|OYSTER|BUS |TAXI|UBER(?!.*EAT)/.test(d)) return 'transport';
  if (/MCDONALD|KFC|PIZZA|UBER\s*EAT|DELIVEROO|JUST\s*EAT|NANDO|GREGGS|STARBUCKS|COSTA|CAFFE|RESTAURANT|PRET/.test(d)) return 'eating_out';
  if (/NETFLIX|SPOTIFY|DISNEY|SKY |NOW TV|APPLE TV|YOUTUBE|PRIME VIDEO|TWITCH|GAME |STEAM/.test(d)) return 'entertainment';
  if (/BOOTS|PHARMACY|NHS |DOCTOR|DENTAL|VISION EXPRESS|SPECSAVERS|HOSPITAL|CHEMIST/.test(d)) return 'health';
  if (/SCHOOL|NURSERY|CHILDCARE|TOYS R US|SMYTHS|EARLY YEARS/.test(d)) return 'kids';
  if (/RENT |MORTGAGE|COUNCIL TAX|UTILITIES|GAS |ELECTRIC|WATER |BROADBAND|BT |VIRGIN MEDIA|INSURANCE/.test(d)) return 'housing';
  if (/SAVINGS|ISA |INVEST|TRADING|VANGUARD|MONEYBOX/.test(d)) return 'savings';
  return 'other';
}

function parseCSVRows(rows: string[][], format: BankFormat): ParsedRow[] {
  const headers = rows[0];
  const idx = (names: string[]) => {
    const h = headers.map(s => s.toLowerCase().trim());
    for (const n of names) { const i = h.findIndex(x => x.includes(n)); if (i >= 0) return i; }
    return -1;
  };

  const results: ParsedRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 2 || row.every(c => !c)) continue;

    let date = '', description = '', amount = 0, type: 'expense' | 'income' = 'expense';

    if (format === 'monzo') {
      const di = idx(['date']); const ni = idx(['name']); const ai = idx(['amount']); const desi = idx(['description']);
      date = normaliseDate(row[di] || '');
      description = row[ni] || row[desi] || '';
      const raw = parseFloat((row[ai] || '0').replace(/[£,]/g, ''));
      amount = Math.abs(raw);
      type = raw >= 0 ? 'income' : 'expense';

    } else if (format === 'revolut') {
      const di = idx(['completed date', 'started date']); const desi = idx(['description']); const ai = idx(['amount']); const si = idx(['state']);
      if (si >= 0 && row[si]?.toLowerCase() !== 'completed') continue;
      date = normaliseDate(row[di] || '');
      description = row[desi] || '';
      const raw = parseFloat((row[ai] || '0').replace(/[,]/g, ''));
      amount = Math.abs(raw);
      type = raw >= 0 ? 'income' : 'expense';

    } else if (format === 'uk_debit_credit') {
      const di = idx(['date']); const desi = idx(['description', 'narrative', 'details', 'memo']); const debi = idx(['debit']); const credi = idx(['credit']);
      date = normaliseDate(row[di] || '');
      description = row[desi] || '';
      const debit = parseFloat((row[debi] || '').replace(/[£, ]/g, '')) || 0;
      const credit = parseFloat((row[credi] || '').replace(/[£, ]/g, '')) || 0;
      if (debit > 0) { amount = debit; type = 'expense'; }
      else if (credit > 0) { amount = credit; type = 'income'; }
      else continue;

    } else {
      // generic: Date, Description, Amount
      const di = idx(['date']); const desi = idx(['description', 'narrative', 'details', 'memo', 'payee', 'transaction']); const ai = idx(['amount', 'value']);
      date = normaliseDate(row[di] || '');
      description = row[desi] || row[1] || '';
      const raw = parseFloat((row[ai] || row[2] || '0').replace(/[£,]/g, ''));
      amount = Math.abs(raw);
      type = raw >= 0 ? 'income' : 'expense';
    }

    if (!amount || !description) continue;
    results.push({ id: crypto.randomUUID(), date, description: description.trim(), amount, type, category: autoCategory(description) });
  }

  return results;
}

// ─────────────────────────────────────────────
// PDF PARSING HELPERS
// ─────────────────────────────────────────────

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

function parsePDFText(text: string): ParsedRow[] {
  const results: ParsedRow[] = [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Patterns for dates: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, DD Mon YY
  const DATE_RE = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4})\b/i;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;

    const dateStr = normaliseDate(dateMatch[1]);

    // Remove the date from the line to find description + amount
    const rest = line.replace(dateMatch[0], '').trim();

    // Find all amounts in the rest
    const amounts = [...rest.matchAll(/[£€$]?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\s*(CR|DR)?/gi)];
    if (amounts.length === 0) continue;

    // Last amount is usually the transaction amount; second-to-last might be balance
    const amountMatch = amounts[amounts.length > 1 ? amounts.length - 2 : 0];
    if (!amountMatch) continue;

    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!rawAmount || rawAmount <= 0) continue;

    const crDr = (amountMatch[2] || '').toUpperCase();
    const type: 'income' | 'expense' = crDr === 'CR' ? 'income' : 'expense';

    // Description is text before the first amount (strip out numbers/symbols)
    const descRaw = rest.replace(/[£€$]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*(?:CR|DR)?/gi, ' ').trim();
    const description = descRaw.replace(/\s+/g, ' ').trim();
    if (!description || description.length < 2) continue;

    results.push({
      id: crypto.randomUUID(),
      date: dateStr,
      description,
      amount: rawAmount,
      type,
      category: autoCategory(description),
    });
  }

  return results;
}

// ─────────────────────────────────────────────
// CSV IMPORT CARD  (now also accepts PDF)
// ─────────────────────────────────────────────

function CSVImportCard({ onImport, currency }: { onImport: (rows: ParsedRow[], bankName: string) => void; currency: string }) {
  const [stage, setStage] = useState<'idle' | 'preview' | 'done' | 'loading'>('idle');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [bankName, setBankName] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      // PDF branch
      setStage('loading');
      extractTextFromPDF(file).then(text => {
        const data = parsePDFText(text);
        if (data.length === 0) {
          setError(i18n.t('budget.pdfNoTransactions'));
          setStage('idle');
          return;
        }
        setParsed(data);
        setBankName('PDF Statement');
        setStage('preview');
      }).catch((err: unknown) => {
        console.error('[BudgetScreen] PDF parse error:', err);
        setError(i18n.t('budget.pdfReadFailed', { msg: getErrorMessage(err) }));
        setStage('idle');
      });
    } else {
      // CSV branch
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const rows = parseCSVText(text);
          if (rows.length < 2) { setError(i18n.t('budget.csvNoDataRows')); return; }
          const fmt = detectBankFormat(rows[0]);
          const name = detectBankName(rows[0]);
          const data = parseCSVRows(rows, fmt);
          if (data.length === 0) { setError(i18n.t('budget.csvNoValidTransactions')); return; }
          setParsed(data);
          setBankName(name);
          setStage('preview');
        } catch {
          setError(i18n.t('budget.csvParseFailed'));
        }
      };
      reader.readAsText(file);
    }
    // reset input so same file can be re-uploaded
    e.target.value = '';
  }

  function updateCategory(id: string, cat: TxCategory) {
    setParsed(prev => prev.map(r => r.id === id ? { ...r, category: cat } : r));
  }

  function handleImport() {
    onImport(parsed, bankName);
    setDoneMsg(i18n.t('budget.importSuccess', { count: parsed.length, bank: bankName }));
    setStage('done');
    setTimeout(() => { setStage('idle'); setParsed([]); setDoneMsg(''); }, 5000);
  }


  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '18px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📂</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{i18n.t('budget.importBankStatement')}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i18n.t('budget.uploadCsvOrPdfDesc')}</p>
        </div>
      </div>

      {stage === 'done' && (
        <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, marginBottom: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{doneMsg}</p>
        </div>
      )}

      {stage === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{i18n.t('budget.readingPdf')}</p>
        </div>
      )}

      {stage === 'idle' && (
        <>
          {/* Upload area */}
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', borderRadius: 18, border: '2px dashed #8FA888', background: 'var(--sage-soft)', padding: '22px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 32 }}>📤</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4A7A58' }}>{i18n.t('budget.chooseCsvOrPdf')}</span>
            <span style={{ fontSize: 11, color: '#6B9462' }}>{i18n.t('budget.bankStatementAnyBank')}</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.pdf,application/pdf" onChange={handleFile} style={{ display: 'none' }} />

          {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <span style={{ fontSize: 11, background: 'var(--sage-soft)', color: '#4A7A58', borderRadius: 8, padding: '3px 8px', fontWeight: 600 }}>CSV</span>
            <span style={{ fontSize: 11, background: 'rgba(196,120,138,0.12)', color: 'var(--accent)', borderRadius: 8, padding: '3px 8px', fontWeight: 600 }}>PDF</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
            {i18n.t('budget.worksWithBanksPrefix')} <strong>Monzo</strong>, <strong>Revolut</strong>, <strong>Barclays</strong>, <strong>HSBC</strong>, <strong>Lloyds</strong>, <strong>NatWest</strong>, BRD, BCR {i18n.t('budget.worksWithBanksSuffix')}
          </p>
        </>
      )}

      {stage === 'preview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {i18n.t('budget.transactionsFromBank', { count: parsed.length, bank: bankName })}
            </p>
            <button onClick={() => { setStage('idle'); setParsed([]); }}
              style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✕ {i18n.t('budget.cancel')}
            </button>
          </div>

          {/* Preview table */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 64px 90px', background: 'var(--bg-primary)', padding: '7px 10px', gap: 6 }}>
              {[i18n.t('budget.date'), i18n.t('budget.description'), i18n.t('budget.amount'), i18n.t('budget.category')].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {/* Rows — cap at 50 for performance */}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {parsed.slice(0, 50).map((row, i) => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 64px 90px', padding: '7px 10px', gap: 6, alignItems: 'center', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{row.date.slice(5).replace('-', '/')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: row.type === 'income' ? '#8FA888' : 'var(--accent)', textAlign: 'right' }}>
                    {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount, currency)}
                  </span>
                  <select value={row.category} onChange={e => updateCategory(row.id, e.target.value as TxCategory)}
                    style={{ fontSize: 10, borderRadius: 8, padding: '3px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}>
                    {CAT_KEYS.map(k => (
                      <option key={k} value={k}>{CATEGORIES[k].emoji} {catLabel(k)}</option>
                    ))}
                  </select>
                </div>
              ))}
              {parsed.length > 50 && (
                <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
                  {i18n.t('budget.moreRowsSuffix', { count: parsed.length - 50 })}
                </div>
              )}
            </div>
          </div>

          <button onClick={handleImport}
            style={{ width: '100%', height: 48, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #8FA888 0%, #4A7A58 100%)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 12px rgba(74,122,88,0.3)' }}>
            {i18n.t('budget.importBtn', { count: parsed.length })}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ACCOUNTS TAB
// ─────────────────────────────────────────────

function AccountsTab({ accounts, txs, onSaveAccount, onDeleteAccount, onCSVImport, currency }:
  { accounts: Account[]; txs: BudgetTransaction[]; onSaveAccount: (a: Omit<Account, 'id' | 'createdAt'>) => void; onDeleteAccount: (id: string) => void; onCSVImport: (rows: ParsedRow[], bankName: string) => void; currency: string }) {

  const dateLocale = useDateFnsLocale();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [accType, setAccType] = useState<Account['type']>('current');
  const [startingBalance, setStartingBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  function handleSave() {
    if (!name.trim()) return;
    onSaveAccount({ name: name.trim(), type: accType, balance: parseFloat(startingBalance) || 0, color });
    setName(''); setStartingBalance(''); setShowForm(false);
  }

  function accountBalance(acc: Account) {
    const accTxs = txs.filter(t => t.account_id === acc.id);
    const income = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return acc.balance + income - expense;
  }

  function lastTx(acc: Account) {
    return txs.filter(t => t.account_id === acc.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }

  return (
    <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* CSV Import */}
      <CSVImportCard onImport={onCSVImport} currency={currency} />

      {/* Manual Accounts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{i18n.t('budget.myAccounts')}</p>
          <button onClick={() => setShowForm(f => !f)}
            style={{ height: 34, padding: '0 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#fff', fontWeight: 600, fontSize: 13 }}>
            {i18n.t('budget.addAccountBtn')}
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={i18n.t('budget.accountNamePlaceholder')}
                  style={{ borderRadius: 12, padding: '10px 12px', fontSize: 14, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {(['cash','current','savings','credit'] as Account['type'][]).map(t => (
                    <button key={t} onClick={() => setAccType(t)} style={{
                      padding: '8px 4px', borderRadius: 12, border: '2px solid',
                      borderColor: accType === t ? 'var(--lavender)' : 'transparent',
                      background: accType === t ? 'var(--lavender-soft)' : 'var(--bg-primary)',
                      fontSize: 10, fontWeight: 600, color: accType === t ? 'var(--lavender)' : 'var(--text-secondary)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{ACCOUNT_TYPE_ICONS[t]}</div>
                      {i18n.t(`budget.accountType${t.charAt(0).toUpperCase()}${t.slice(1)}`)}
                    </button>
                  ))}
                </div>

                <input value={startingBalance} onChange={e => setStartingBalance(e.target.value)}
                  type="number" inputMode="decimal" placeholder={i18n.t('budget.startingBalancePlaceholder')}
                  style={{ borderRadius: 12, padding: '10px 12px', fontSize: 14, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />

                <div style={{ display: 'flex', gap: 8 }}>
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, border: '3px solid',
                      borderColor: color === c ? 'var(--text-primary)' : 'transparent',
                    }} />
                  ))}
                </div>

                <button onClick={handleSave} disabled={!name.trim()}
                  style={{ height: 46, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)', color: '#fff', fontWeight: 600, fontSize: 14, opacity: name.trim() ? 1 : 0.5 }}>
                  {i18n.t('budget.saveAccountBtn')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {accounts.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '20px 0' }}>{i18n.t('budget.noAccountsYet')}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map(acc => {
            const balance = accountBalance(acc);
            const last = lastTx(acc);
            return (
              <div key={acc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 16, background: acc.color + '25', border: `2px solid ${acc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {ACCOUNT_TYPE_ICONS[acc.type]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{acc.name}</p>
                    {last && (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {i18n.t('budget.lastTxPrefix', { description: last.description || catLabel(last.category), date: format(new Date(last.date + 'T00:00:00'), 'd MMM', { locale: dateLocale }) })}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: balance >= 0 ? '#8FA888' : '#ef4444' }}>
                      {formatCurrency(balance, currency)}
                    </p>
                    <button onClick={() => onDeleteAccount(acc.id)}
                      style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
                      {i18n.t('budget.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUDGET CONTENT (inner — wrapped by ProGate)
// ─────────────────────────────────────────────

function BudgetContent() {
  const { user } = useAuth();
  const { currency } = useApp();
  const [tab, setTab] = useState<BudgetTab>('overview');
  const [txs, setTxs] = useState<BudgetTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimits>({});
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [overBudgetAlert, setOverBudgetAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setTxs(loadTx(user.id));
    setAccounts(loadAccounts(user.id));
    setBudgets(loadBudgets(user.id));
    setMonthlyBudget(loadMonthlyBudget(user.id));
  }, [user]);

  function addTransaction(data: Omit<BudgetTransaction, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return;
    const tx: BudgetTransaction = { ...data, id: crypto.randomUUID(), user_id: user.id, created_at: new Date().toISOString() };
    const updated = [tx, ...txs];
    setTxs(updated);
    saveTx(user.id, updated);

    // Confirmation toast
    const sign = data.type === 'income' ? '+' : '-';
    setConfirmMsg(i18n.t('budget.addedToCategory', { sign, amount: formatCurrency(data.amount, data.currency), category: catLabel(data.category) }));
    setTimeout(() => setConfirmMsg(null), 3000);

    // Over-budget check (expenses only)
    if (data.type === 'expense') {
      const normCat: TxCategory = data.category === 'food' ? 'groceries' : data.category;
      const limit = budgets[normCat];
      if (limit) {
        const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        const catSpent = updated
          .filter(t => t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
          .filter(t => (t.category === normCat) || (normCat === 'groceries' && t.category === 'food'))
          .reduce((s, t) => s + t.amount, 0);
        if (catSpent > limit) {
          setOverBudgetAlert(i18n.t('budget.exceededBudgetAlert', { category: catLabel(normCat) }));
          setTimeout(() => setOverBudgetAlert(null), 5000);
        }
      }
    }
  }

  function deleteTransaction(id: string) {
    if (!user) return;
    const updated = txs.filter(t => t.id !== id);
    setTxs(updated);
    saveTx(user.id, updated);
  }

  function saveAccountLocal(data: Omit<Account, 'id' | 'createdAt'>) {
    if (!user) return;
    const acc: Account = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [...accounts, acc];
    setAccounts(updated);
    saveAccounts(user.id, updated);
  }

  function deleteAccount(id: string) {
    if (!user) return;
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    saveAccounts(user.id, updated);
  }

  function importCSV(rows: ParsedRow[], bankName: string) {
    if (!user) return;
    const newTxs: BudgetTransaction[] = rows.map(r => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: r.amount,
      currency,
      category: r.category,
      type: r.type,
      description: r.description,
      date: r.date,
      created_at: new Date().toISOString(),
    }));
    const updated = [...newTxs, ...txs];
    setTxs(updated);
    saveTx(user.id, updated);
    setConfirmMsg(i18n.t('budget.importSuccess', { count: rows.length, bank: bankName }));
    setTimeout(() => setConfirmMsg(null), 5000);
  }

  function updateBudgets(b: BudgetLimits) {
    if (!user) return;
    setBudgets(b);
    saveBudgets(user.id, b);
  }

  function updateMonthlyBudget(v: number) {
    if (!user) return;
    setMonthlyBudget(v);
    saveMonthlyBudget(user.id, v);
  }

  const tabs: { key: BudgetTab; label: string }[] = [
    { key: 'overview', label: i18n.t('budget.tabOverview') },
    { key: 'transactions', label: i18n.t('budget.tabTransactions') },
    { key: 'accounts', label: i18n.t('budget.tabAccounts') },
  ];

  return (
    <>
      {/* Tab switcher */}
      <div style={{ display: 'flex', margin: '12px 16px 0', borderRadius: 16, padding: 4, gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600,
            background: tab === tb.key ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'transparent',
            color: tab === tb.key ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s',
          }}>{tb.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === 'overview' && (
            <OverviewTab txs={txs} budgets={budgets} saveBudgetsLocal={updateBudgets} monthlyBudget={monthlyBudget} saveMonthlyBudgetLocal={updateMonthlyBudget} currency={currency} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
          )}
          {tab === 'transactions' && (
            <TransactionsTab txs={txs} accounts={accounts} onDelete={deleteTransaction} onAdd={() => setShowAddSheet(true)} currency={currency} currentMonth={currentMonth} />
          )}
          {tab === 'accounts' && (
            <AccountsTab accounts={accounts} txs={txs} onSaveAccount={saveAccountLocal} onDeleteAccount={deleteAccount} onCSVImport={importCSV} currency={currency} />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAddSheet && (
          <AddTransactionSheet onClose={() => setShowAddSheet(false)} onSave={addTransaction} accounts={accounts} currency={currency} />
        )}
      </AnimatePresence>

      {/* FAB on overview tab */}
      {tab === 'overview' && (
        <button onClick={() => setShowAddSheet(true)} style={{
          position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 20,
          background: 'linear-gradient(135deg, var(--accent-gold, #D4AF37) 0%, #B8935A 100%)',
          border: 'none', color: '#fff', zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}

      {/* Confirmation toast */}
      <AnimatePresence>
        {confirmMsg && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#2C2A35', color: '#fff', borderRadius: 14, padding: '10px 20px', fontSize: 13, fontWeight: 500, zIndex: 99, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            ✓ {confirmMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Over-budget alert */}
      <AnimatePresence>
        {overBudgetAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 70, left: 16, right: 16, zIndex: 99, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', flex: 1 }}>{overBudgetAlert}</p>
            <button onClick={() => setOverBudgetAlert(null)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────
// MAIN — wrapped in ProGate
// ─────────────────────────────────────────────

export function BudgetScreen() {
  return (
    <Layout background="url('/bg-budget.jpg') center/cover no-repeat">
      <div className="px-5 pt-5 pb-2">
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#3D2B1F', letterSpacing: '-0.01em', margin: 0 }}>{i18n.t('budget.title')}</h1>
      </div>
      <ProGate feature={i18n.t('budget.proGateFeature')}>
        <BudgetContent />
      </ProGate>
    </Layout>
  );
}
