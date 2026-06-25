import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addWeeks, startOfWeek, addDays, isToday } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { LuxuryScreenHeader } from '../components/ui/LuxuryScreenHeader';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/anthropic';
import type { ShoppingItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type KitchenTab = 'meals' | 'shopping' | 'recipes';

type MealSlot = { name: string; emoji: string; time: string };
type DayPlan = { date: string; breakfast?: MealSlot; lunch?: MealSlot; dinner?: MealSlot };

type RecipeStep = { text: string; emoji: string; duration: number | null };
type RecipeIngredient = { amount: string; name: string; emoji?: string };

type SavedRecipe = {
  id: string;
  title: string;
  emoji: string;
  prepTime: string;
  cookTime: string;
  servings?: number;
  difficulty: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tip?: string;
  savedAt: string;
};

type GeneratedRecipe = Omit<SavedRecipe, 'id' | 'savedAt'>;

// ── localStorage helpers ──────────────────────────────────────────────────────

const MEALS_KEY  = (uid: string) => `mm_meals_${uid}`;
const SHOP_KEY   = (uid: string) => `mm_shopping_${uid}`;
const RECIPE_KEY = (uid: string) => `mm_recipes_${uid}`;

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }

// ── Category helpers ──────────────────────────────────────────────────────────

const CATEGORIES = ['Produce', 'Meat & Fish', 'Dairy', 'Pantry', 'Bakery', 'Other'] as const;
type Category = typeof CATEGORIES[number];

const CAT_EMOJI: Record<Category, string> = {
  'Produce': '🥬', 'Meat & Fish': '🥩', 'Dairy': '🧀',
  'Pantry': '🫙', 'Bakery': '🍞', 'Other': '🛒',
};

function guessCategory(name: string): Category {
  const n = name.toLowerCase();
  if (/\b(apple|banana|orange|berry|berries|grape|lemon|lime|mango|pear|peach|plum|strawberr|blueberr|raspberr|melon|avocado|tomato|lettuce|spinach|kale|rocket|carrot|potato|onion|garlic|pepper|courgette|broccoli|cucumber|mushroom|celery|leek|parsnip|parsley|basil|coriander|mint|herb|salad|veg|fruit|ginger|spring onion|chilli)\b/.test(n)) return 'Produce';
  if (/\b(chicken|beef|lamb|pork|turkey|salmon|tuna|cod|fish|prawn|shrimp|sausage|bacon|mince|steak|ham|duck|seafood|meat|chorizo)\b/.test(n)) return 'Meat & Fish';
  if (/\b(milk|cheese|butter|cream|yogurt|yoghurt|egg|eggs|cheddar|mozzarella|parmesan|feta|halloumi|creme fraiche|sour cream|dairy)\b/.test(n)) return 'Dairy';
  if (/\b(pasta|rice|flour|sugar|salt|pepper|oil|vinegar|sauce|tin|can|lentil|bean|chickpea|oat|oats|cereal|honey|jam|spice|stock|broth|noodle|couscous|quinoa|baking|yeast|cocoa|chocolate|coffee|tea|canned)\b/.test(n)) return 'Pantry';
  if (/\b(bread|loaf|roll|bun|bagel|muffin|cake|pastry|croissant|sourdough|wrap|pitta|tortilla|crackers)\b/.test(n)) return 'Bakery';
  return 'Other';
}

// ── Duration parser ────────────────────────────────────────────────────────────

function parseStepDuration(text: string): number | null {
  const t = text.toLowerCase();
  let total = 0;
  const h = t.match(/(\d+)\s*hour/); if (h) total += parseInt(h[1]) * 3600;
  const m = t.match(/(\d+)\s*min/);  if (m) total += parseInt(m[1]) * 60;
  const s = t.match(/(\d+)\s*sec/);  if (s) total += parseInt(s[1]);
  return total > 0 ? total : null;
}

function normaliseSteps(raw: (RecipeStep | string)[]): RecipeStep[] {
  return raw.map((s) =>
    typeof s === 'string'
      ? { text: s, emoji: '🍳', duration: parseStepDuration(s) }
      : { ...s, duration: s.duration ?? parseStepDuration(s.text) }
  );
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, active, onClick, activeColor = 'var(--accent)' }: { label: string; active: boolean; onClick: () => void; activeColor?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500,
      border: active ? 'none' : '1px solid var(--border)',
      background: active ? activeColor : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--text-secondary)',
      flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s',
    }}>{label}</button>
  );
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 }}
            onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51, background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>{title}</p>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════════════
// COOK MODE TIMER
// ════════════════════════════════════════════════════════════════════

const CIRCLE_R = 52;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

function CookTimer({ total, onDone }: { total: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setRemaining(total); setRunning(false); setDone(false); }, [total]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
            onDone();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, onDone]);

  const progress = remaining / total;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#EDF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 48 }}>✅</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#4A7A58' }}>Done! ✓</p>
        <button onClick={() => { setRemaining(total); setDone(false); }}
          style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'underline' }}>Reset</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={CIRCLE_R} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="60" cy="60" r={CIRCLE_R} fill="none" stroke="var(--accent)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <p style={{ position: 'absolute', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 0 }}>
        {fmtTime(remaining)}
      </p>
      <button
        onClick={() => setRunning((r) => !r)}
        style={{
          width: 100, height: 40, borderRadius: 20, border: 'none',
          background: running ? '#fee2e2' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          color: running ? '#dc2626' : '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 4,
        }}
      >
        {running ? '⏸ Pause' : '▶ Start'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COOK MODE
// ════════════════════════════════════════════════════════════════════

const CONFETTI_COLORS = ['#C4788A', '#9B8CBD', '#6BAF78', '#FFAB7A', '#4A7A58', '#D4AF37'];

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-10px',
          width: 8, height: 8,
          borderRadius: Math.random() > 0.5 ? '50%' : 2,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `confettiFall ${1.5 + Math.random() * 2}s ${Math.random() * 0.5}s ease-in forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

function CookMode({ recipe, onClose }: { recipe: GeneratedRecipe | SavedRecipe; onClose: () => void }) {
  const steps = normaliseSteps(recipe.steps as (RecipeStep | string)[]);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [complete, setComplete] = useState(false);
  const [rating, setRating] = useState<string | null>(null);

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  function prev() { if (!isFirst) setCurrent((c) => c - 1); }
  function next() {
    if (isLast) { setComplete(true); }
    else { setCurrent((c) => c + 1); }
  }
  function markDone(i: number) {
    setDone((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  if (complete) {
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 16 }}>
        <Confetti />
        <span style={{ fontSize: 72 }}>🎉</span>
        <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>Recipe Complete!</p>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center' }}>{recipe.title}</p>

        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 12 }}>How did it go?</p>
          <div className="flex gap-5 justify-center">
            {(['😍', '👍', '😐'] as const).map((r) => (
              <button key={r} onClick={() => setRating(r)}
                style={{ fontSize: 36, opacity: rating && rating !== r ? 0.4 : 1, transition: 'opacity 0.2s', transform: rating === r ? 'scale(1.2)' : 'scale(1)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{
          marginTop: 16, width: '100%', height: 52, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer',
        }}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Step counter + progress */}
      <div style={{ padding: '0 24px 12px' }}>
        <div className="flex items-center justify-between mb-2">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Step {current + 1} of {steps.length}</p>
          <button onClick={() => markDone(current)}
            style={{ fontSize: 12, color: done.has(current) ? '#4A7A58' : 'var(--text-muted)', fontWeight: 500 }}>
            {done.has(current) ? '✓ Done' : 'Mark done'}
          </button>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'var(--accent)', width: `${((current + 1) / steps.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Step content — swipeable */}
      <motion.div
        key={current}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.22 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) next();
          if (info.offset.x > 60) prev();
        }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', gap: 20, cursor: 'grab' }}
      >
        <span style={{ fontSize: 64, lineHeight: 1, userSelect: 'none' }}>{step.emoji}</span>
        <p style={{
          fontSize: 20, fontWeight: 500, color: 'var(--text-primary)',
          textAlign: 'center', lineHeight: 1.5,
          opacity: done.has(current) ? 0.45 : 1,
          textDecoration: done.has(current) ? 'line-through' : 'none',
        }}>
          {step.text}
        </p>

        {/* Timer */}
        {step.duration && (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CookTimer total={step.duration} onDone={() => markDone(current)} />
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div style={{ padding: '12px 20px 32px', display: 'flex', gap: 12 }}>
        <button onClick={prev} disabled={isFirst}
          style={{
            flex: 1, height: 56, borderRadius: 18, border: '2px solid var(--border)',
            background: 'var(--bg-card)', color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
            fontWeight: 600, fontSize: 16, cursor: isFirst ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Previous
        </button>
        <button onClick={next}
          style={{
            flex: 1, height: 56, borderRadius: 18, border: 'none',
            background: isLast ? 'linear-gradient(135deg, #4A7A58, #6BAF78)' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {isLast ? '🎉 Finish' : 'Next'}
          {!isLast && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// RECIPE DETAIL MODAL (full-screen)
// ════════════════════════════════════════════════════════════════════

type RecipeDetailTab = 'ingredients' | 'steps' | 'cook';

function RecipeDetailModal({ recipe, initialTab = 'ingredients', onClose, onSave, userId }: {
  recipe: GeneratedRecipe | SavedRecipe;
  initialTab?: RecipeDetailTab;
  onClose: () => void;
  onSave?: () => void;
  userId?: string;
}) {
  const [tab, setTab] = useState<RecipeDetailTab>(initialTab);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const steps = normaliseSteps(recipe.steps as (RecipeStep | string)[]);

  function toggleIngredient(i: number) {
    setCheckedIngredients((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleStep(i: number) {
    setCheckedSteps((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function addAllToShop() {
    if (!userId) return;
    const existing: ShoppingItem[] = load(SHOP_KEY(userId), []);
    const newItems: ShoppingItem[] = recipe.ingredients.map((ing) => ({
      id: crypto.randomUUID(), user_id: userId,
      name: `${ing.name}${ing.amount ? ` — ${ing.amount}` : ''}`,
      quantity: undefined, unit: undefined,
      list_name: recipe.title,
      checked: false, created_at: new Date().toISOString(),
    }));
    save(SHOP_KEY(userId), [...existing, ...newItems]);
  }

  function diffBadge(d: string) {
    const dl = d.toLowerCase();
    if (dl === 'hard') return { bg: 'var(--accent-soft)', color: 'var(--accent)' };
    if (dl === 'medium') return { bg: '#FFF0E8', color: '#C4784A' };
    return { bg: '#EDF5ED', color: '#4A7A58' };
  }

  const badge = diffBadge(recipe.difficulty);
  const stepsComplete = checkedSteps.size;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 48, lineHeight: 1 }}>{recipe.emoji}</span>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{recipe.title}</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9999, padding: '3px 10px', color: 'var(--text-secondary)' }}>⏱ {recipe.prepTime}</span>
                  <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9999, padding: '3px 10px', color: 'var(--text-secondary)' }}>🔥 {recipe.cookTime}</span>
                  {'servings' in recipe && recipe.servings && (
                    <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9999, padding: '3px 10px', color: 'var(--text-secondary)' }}>👥 {recipe.servings}</span>
                  )}
                  <span style={{ fontSize: 12, borderRadius: 9999, padding: '3px 10px', fontWeight: 500, textTransform: 'capitalize', background: badge.bg, color: badge.color }}>{recipe.difficulty}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-2xl p-1 gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {([
              { id: 'ingredients', label: '🛒 Ingredients' },
              { id: 'steps', label: `📋 Steps${stepsComplete > 0 ? ` (${stepsComplete}/${steps.length})` : ''}` },
              { id: 'cook', label: '👨‍🍳 Cook' },
            ] as { id: RecipeDetailTab; label: string }[]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={tab === t.id ? { background: tab === 'cook' ? 'linear-gradient(135deg, #C4784A, #E8A87C)' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: tab === 'cook' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
          {tab === 'ingredients' && (
            <div style={{ padding: '16px 16px 120px' }}>
              {recipe.ingredients.map((ing, i) => (
                <button key={i} onClick={() => toggleIngredient(i)}
                  className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 mb-2"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'left' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: checkedIngredients.has(i) ? 'none' : '2px solid var(--border-strong)', background: checkedIngredients.has(i) ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {checkedIngredients.has(i) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  {ing.emoji && <span style={{ fontSize: 18 }}>{ing.emoji}</span>}
                  <span style={{ flex: 1, fontSize: 14, color: checkedIngredients.has(i) ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checkedIngredients.has(i) ? 'line-through' : 'none' }}>
                    <strong>{ing.amount}</strong> {ing.name}
                  </span>
                </button>
              ))}
              {recipe.tip && (
                <div style={{ background: '#FFF8E6', borderRadius: 16, padding: '12px 14px', marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: '#B8860B' }}>💡 <strong>Chef's tip:</strong> {recipe.tip}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'steps' && (
            <div style={{ padding: '16px 16px 40px' }}>
              {/* Progress bar */}
              <div style={{ marginBottom: 16 }}>
                <div className="flex justify-between mb-1">
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Step {Math.min(stepsComplete + 1, steps.length)} of {steps.length}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round((stepsComplete / steps.length) * 100)}%</p>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${(stepsComplete / steps.length) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              {steps.map((step, i) => (
                <button key={i} onClick={() => toggleStep(i)}
                  className="flex items-start gap-3 w-full rounded-2xl px-4 py-3 mb-2"
                  style={{ background: checkedSteps.has(i) ? '#EDF5ED' : 'var(--bg-card)', border: `1px solid ${checkedSteps.has(i) ? '#6BAF78' : 'var(--border)'}`, textAlign: 'left' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: checkedSteps.has(i) ? '#4A7A58' : 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {checkedSteps.has(i) ? '✓' : i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: checkedSteps.has(i) ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checkedSteps.has(i) ? 'line-through' : 'none', lineHeight: 1.5 }}>
                      {step.text}
                    </p>
                    {step.duration && (
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, marginTop: 2, display: 'block' }}>
                        ⏱ {fmtTime(step.duration)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'cook' && (
            <CookMode recipe={recipe} onClose={onClose} />
          )}
        </div>

        {/* Bottom actions for ingredients/steps tabs */}
        {tab !== 'cook' && (
          <div style={{ padding: '12px 16px 32px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {tab === 'ingredients' && (
              <div className="flex gap-3">
                <button onClick={addAllToShop} style={{ flex: 1, height: 48, borderRadius: 14, border: 'none', background: '#EDF5ED', color: '#4A7A58', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  🛒 Add all to shopping list
                </button>
                <button onClick={() => setTab('cook')} style={{ flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #C4784A, #E8A87C)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  👨‍🍳 Start Cooking
                </button>
              </div>
            )}
            {tab === 'steps' && (
              <button onClick={() => setTab('cook')} style={{ width: '100%', height: 48, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #C4784A, #E8A87C)', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                👨‍🍳 Enter Cook Mode
              </button>
            )}
            {onSave && (
              <button onClick={onSave} style={{ width: '100%', marginTop: 10, height: 44, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #C4B8D8, #9B8CBD)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Save Recipe ♡
              </button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════════════
// MEALS TAB
// ════════════════════════════════════════════════════════════════════

function MealsTab() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const [weekOffset, setWeekOffset] = useState(0);
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);
  const [people, setPeople] = useState(4);
  const [diet, setDiet] = useState('Any');
  const [cuisine, setCuisine] = useState('Any');
  const [addingToShop, setAddingToShop] = useState(false);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (!user) return;
    setPlan(load(MEALS_KEY(user.id), []));
  }, [user]);

  function savePlan(updated: DayPlan[]) {
    if (!user) return;
    setPlan(updated);
    save(MEALS_KEY(user.id), updated);
  }

  async function generateMenu() {
    setShowPrefs(false);
    setGenerating(true);
    setError('');
    try {
      const prompt = `Create a 7-day meal plan for ${people} people. Diet: ${diet}. Cuisine: ${cuisine}.
Return ONLY valid JSON array, no markdown:
[{"date":"yyyy-MM-dd","breakfast":{"name":"meal","emoji":"🥣","time":"10 min"},"lunch":{"name":"meal","emoji":"🥗","time":"15 min"},"dinner":{"name":"meal","emoji":"🍝","time":"30 min"}}]
Use dates for the week starting ${format(weekStart, 'yyyy-MM-dd')}.`;
      const raw = await askAI(prompt, 2000, i18n.language);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Invalid response');
      const parsed: DayPlan[] = JSON.parse(match[0]);
      const mapped = weekDays.map((day, i) => {
        const ds = format(day, 'yyyy-MM-dd');
        return parsed[i] ? { ...parsed[i], date: ds } : { date: ds };
      });
      savePlan(mapped);
    } catch { setError('Could not generate meal plan. Please try again.'); }
    finally { setGenerating(false); }
  }

  async function addToShoppingList() {
    if (!user || plan.length === 0) return;
    setAddingToShop(true);
    try {
      const mealNames = plan.flatMap((d) => [d.breakfast?.name, d.lunch?.name, d.dinner?.name].filter(Boolean)).join(', ');
      const raw = await askAI(`Based on meals: ${mealNames}\nGenerate shopping list for ${people} people.\nReturn ONLY valid JSON: [{"name":"item","quantity":"500g","category":"Produce"}]`, 1000, i18n.language);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match || !user) return;
      const items: { name: string; quantity: string }[] = JSON.parse(match[0]);
      const existing: ShoppingItem[] = load(SHOP_KEY(user.id), []);
      save(SHOP_KEY(user.id), [...existing, ...items.map((it) => ({
        id: crypto.randomUUID(), user_id: user.id,
        name: `${it.name}${it.quantity ? ` — ${it.quantity}` : ''}`,
        quantity: undefined, unit: undefined, list_name: 'This Week',
        checked: false, created_at: new Date().toISOString(),
      }))]);
    } catch { /* silent */ }
    finally { setAddingToShop(false); }
  }

  function planForDate(ds: string) { return plan.find((d) => d.date === ds); }

  const DIETS = ['Any', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'];
  const CUISINES = ['Any', 'British', 'Italian', 'Mediterranean', 'Asian', 'Mexican'];

  return (
    <div className="mt-3 pb-28">
      {/* AI Generator card */}
      <div className="mx-4 mb-4 rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, #FFD4B0 0%, #FFAB7A 100%)' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#7A3A10', marginBottom: 4 }}>Generate Weekly Menu ✨</p>
        <p style={{ fontSize: 13, color: '#9A5A30', marginBottom: 12 }}>AI-powered meal plan for your family</p>
        <button onClick={() => setShowPrefs(true)} disabled={generating}
          style={{ width: '100%', height: 44, borderRadius: 14, border: 'none', background: generating ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)', color: '#7A3A10', fontWeight: 600, fontSize: 14, cursor: generating ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {generating ? <><Spinner /> Generating...</> : 'Set preferences & generate'}
        </button>
      </div>

      {error && <div className="mx-4 mb-3 rounded-2xl px-4 py-3" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}><p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p></div>}

      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 mb-3">
        <button onClick={() => setWeekOffset((w) => w - 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</p>
        <button onClick={() => setWeekOffset((w) => w + 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Day cards */}
      <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {weekDays.map((day) => {
          const ds = format(day, 'yyyy-MM-dd');
          const dayPlan = planForDate(ds);
          const today = isToday(day);
          return (
            <div key={ds} style={{ flexShrink: 0, width: 160, background: 'var(--bg-card)', border: `2px solid ${today ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 20, padding: 12, boxShadow: today ? '0 2px 12px rgba(196,120,138,0.15)' : undefined }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 12, fontWeight: 700, color: today ? 'var(--accent)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(day, 'EEE')}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(day, 'd')}</p>
              </div>
              {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => {
                const meal = dayPlan?.[slot];
                return (
                  <button key={slot}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 10, marginBottom: 4, background: meal ? 'var(--bg-primary)' : 'transparent', border: meal ? '1px solid var(--border)' : '1px dashed var(--border)', cursor: meal ? 'pointer' : 'default' }}>
                    {meal ? (
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 14 }}>{meal.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{slot}</p>
                          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{slot[0].toUpperCase()}{slot.slice(1)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {plan.length > 0 && (
        <div className="px-4 mt-4">
          <button onClick={addToShoppingList} disabled={addingToShop}
            style={{ width: '100%', height: 44, borderRadius: 14, border: 'none', background: addingToShop ? 'var(--border)' : '#EDF5ED', color: '#4A7A58', fontWeight: 600, fontSize: 14, cursor: addingToShop ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {addingToShop ? <><Spinner />Adding…</> : '🛒 Add ingredients to shopping list'}
          </button>
        </div>
      )}

      <BottomSheet open={showPrefs} onClose={() => setShowPrefs(false)} title="Meal Plan Preferences">
        <div className="flex flex-col gap-5">
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Number of people</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setPeople((p) => Math.max(1, p - 1))} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', minWidth: 24, textAlign: 'center' }}>{people}</span>
              <button onClick={() => setPeople((p) => Math.min(10, p + 1))} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Diet preference</p>
            <div className="flex flex-wrap gap-2">{DIETS.map((d) => <Pill key={d} label={d} active={diet === d} onClick={() => setDiet(d)} activeColor="#FFAB7A" />)}</div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Cuisine</p>
            <div className="flex flex-wrap gap-2">{CUISINES.map((c) => <Pill key={c} label={c} active={cuisine === c} onClick={() => setCuisine(c)} activeColor="#FFAB7A" />)}</div>
          </div>
          <button onClick={generateMenu} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #FFD4B0 0%, #FFAB7A 100%)', color: '#7A3A10', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Generate Menu ✨
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SHOPPING TAB
// ════════════════════════════════════════════════════════════════════

function ShoppingTab() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<string[]>(['Shopping']);
  const [activeList, setActiveList] = useState('Shopping');
  const [newItem, setNewItem] = useState('');
  const [generating, setGenerating] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const all: ShoppingItem[] = load(SHOP_KEY(user.id), []);
    setItems(all);
    const names = [...new Set(all.map((i) => i.list_name))];
    if (!names.includes('Shopping')) names.unshift('Shopping');
    setLists(names);
    setActiveList(names[0]);
  }, [user]);

  function persist(updated: ShoppingItem[]) {
    if (!user) return;
    setItems(updated);
    save(SHOP_KEY(user.id), updated);
  }

  function addItem() {
    if (!user || !newItem.trim()) return;
    persist([...items, { id: crypto.randomUUID(), user_id: user.id, name: newItem.trim(), quantity: undefined, unit: undefined, list_name: activeList, checked: false, created_at: new Date().toISOString() }]);
    setNewItem('');
  }

  function toggleItem(id: string) { persist(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i)); }
  function deleteItem(id: string) { persist(items.filter((i) => i.id !== id)); }
  function clearBought() { persist(items.filter((i) => !(i.list_name === activeList && i.checked))); }

  async function generateFromMeals() {
    if (!user) return;
    setGenerating(true);
    try {
      const meals: DayPlan[] = load(MEALS_KEY(user.id), []);
      const mealNames = meals.flatMap((d) => [d.breakfast?.name, d.lunch?.name, d.dinner?.name].filter(Boolean)).join(', ');
      const prompt = mealNames
        ? `Meals: ${mealNames}\nGenerate shopping list for 4 people.\nReturn ONLY valid JSON: [{"name":"item","quantity":"500g","category":"Produce"}]`
        : `Generate a weekly family shopping list (20 items).\nReturn ONLY valid JSON: [{"name":"item","quantity":"amount","category":"Produce"}]`;
      const raw = await askAI(prompt, 1000, i18n.language);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: { name: string; quantity: string }[] = JSON.parse(match[0]);
        const existing: ShoppingItem[] = load(SHOP_KEY(user.id), []);
        persist([...existing, ...parsed.map((it) => ({ id: crypto.randomUUID(), user_id: user.id, name: it.name + (it.quantity ? ` — ${it.quantity}` : ''), quantity: undefined, unit: undefined, list_name: activeList, checked: false, created_at: new Date().toISOString() }))]);
      }
    } catch { /* silent */ }
    finally { setGenerating(false); }
  }

  const listItems = items.filter((i) => i.list_name === activeList);
  const bought = listItems.filter((i) => i.checked).length;
  const pct = listItems.length === 0 ? 0 : Math.round((bought / listItems.length) * 100);
  const unchecked = listItems.filter((i) => !i.checked);
  const checkedItems = listItems.filter((i) => i.checked);
  const grouped: Record<Category, ShoppingItem[]> = {} as Record<Category, ShoppingItem[]>;
  CATEGORIES.forEach((c) => { grouped[c] = []; });
  unchecked.forEach((it) => { grouped[guessCategory(it.name)].push(it); });

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  }

  return (
    <div className="mt-3 pb-28">
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{bought} of {listItems.length} items</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pct}%</p>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #6BAF78, #4A7A58)' }} />
        </div>
      </div>

      <div className="px-4 mb-3">
        <button onClick={generateFromMeals} disabled={generating}
          style={{ width: '100%', height: 44, borderRadius: 14, border: 'none', background: generating ? 'var(--border)' : '#EDF5ED', color: '#4A7A58', fontWeight: 600, fontSize: 14, cursor: generating ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {generating ? <><Spinner />Generating…</> : "Generate from this week's meals ✨"}
        </button>
      </div>

      <div className="px-4 mb-3 flex gap-2">
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Add item..."
          style={{ flex: 1, height: 44, borderRadius: 14, padding: '0 14px', fontSize: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
        <button onClick={addItem} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6BAF78, #4A7A58)', color: '#fff', fontSize: 22, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>+</button>
      </div>

      <div className="flex gap-2 px-4 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {lists.map((list) => (
          <button key={list} onClick={() => setActiveList(list)}
            style={{ padding: '6px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500, flexShrink: 0, border: activeList === list ? 'none' : '1px solid var(--border)', background: activeList === list ? 'linear-gradient(135deg, #6BAF78, #4A7A58)' : 'var(--bg-card)', color: activeList === list ? '#fff' : 'var(--text-secondary)' }}>
            {list}
          </button>
        ))}
      </div>

      {listItems.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, padding: '32px 16px' }}>No items yet — add one above or generate from meals</p>
      ) : (
        <div className="px-4">
          {CATEGORIES.map((cat) => {
            const catItems = grouped[cat];
            if (catItems.length === 0) return null;
            const open = !collapsed.has(cat);
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <button onClick={() => toggleCollapse(cat)} className="flex items-center justify-between w-full" style={{ marginBottom: 6 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>{CAT_EMOJI[cat]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: '1px 7px', background: '#EDF5ED', color: '#4A7A58' }}>{catItems.length}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                      {catItems.map((item) => <ShopItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {checkedItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Bought ({checkedItems.length})</p>
                <button onClick={clearBought} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Clear bought</button>
              </div>
              {checkedItems.map((item) => <ShopItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShopItemRow({ item, onToggle, onDelete }: { item: ShoppingItem; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button onClick={() => onToggle(item.id)} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: item.checked ? 'none' : '2px solid var(--border-strong)', background: item.checked ? '#4A7A58' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <span style={{ flex: 1, fontSize: 14, color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
      <button onClick={() => onDelete(item.id)} style={{ padding: 4, color: 'var(--text-muted)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// RECIPES TAB
// ════════════════════════════════════════════════════════════════════

function RecipesTab() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState('');
  const [people, setPeople] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [detailRecipe, setDetailRecipe] = useState<GeneratedRecipe | SavedRecipe | null>(null);
  const [detailTab, setDetailTab] = useState<RecipeDetailTab>('ingredients');
  const [savedId, setSavedId] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const raw = load<(SavedRecipe | (Omit<SavedRecipe, 'steps'> & { steps: (RecipeStep | string)[] }))[]>(RECIPE_KEY(user.id), []);
    setSavedRecipes(raw.map((r) => ({ ...r, steps: normaliseSteps(r.steps) })));
  }, [user]);

  async function generateRecipe() {
    if (!ingredients.trim()) return;
    setLoading(true);
    setError('');
    setGenerated(null);
    setSavedId('');
    try {
      const prompt = `Create a recipe using: ${ingredients}. For ${people} people.
For each step that involves cooking, mention the exact time (e.g. "Cook for 5 minutes"). Include relevant emoji for each step.
Return ONLY valid JSON, no markdown:
{
  "title": "Recipe name",
  "emoji": "🍳",
  "prepTime": "10 min",
  "cookTime": "20 min",
  "servings": ${people},
  "difficulty": "easy",
  "ingredients": [{ "amount": "200g", "name": "chicken breast", "emoji": "🍗" }],
  "steps": [
    { "text": "Season chicken with salt and pepper.", "emoji": "🧂", "duration": null },
    { "text": "Cook chicken for 8 minutes each side.", "emoji": "🍳", "duration": 480 }
  ],
  "tip": "Chef tip here"
}`;
      const raw = await askAI(prompt, 1200, i18n.language);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid response');
      const parsed = JSON.parse(match[0]);
      parsed.steps = normaliseSteps(parsed.steps);
      setGenerated(parsed);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch { setError('Could not generate recipe. Please try again.'); }
    finally { setLoading(false); }
  }

  function saveRecipe() {
    if (!user || !generated) return;
    const saved: SavedRecipe = { ...generated, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
    const updated = [saved, ...savedRecipes];
    setSavedRecipes(updated);
    save(RECIPE_KEY(user.id), updated);
    setSavedId(saved.id);
  }

  function deleteRecipe(id: string) {
    if (!user) return;
    const updated = savedRecipes.filter((r) => r.id !== id);
    setSavedRecipes(updated);
    save(RECIPE_KEY(user.id), updated);
  }

  function diffBadge(d: string) {
    const dl = d.toLowerCase();
    if (dl === 'hard') return { bg: 'var(--accent-soft)', color: 'var(--accent)' };
    if (dl === 'medium') return { bg: '#FFF0E8', color: '#C4784A' };
    return { bg: '#EDF5ED', color: '#4A7A58' };
  }

  return (
    <div className="mt-3 pb-28">
      {/* Generator card */}
      <div className="mx-4 mb-4 rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, #E8E0F5 0%, #C4B8D8 100%)' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#4A3A6A', marginBottom: 4 }}>Find a Recipe ✨</p>
        <p style={{ fontSize: 13, color: '#6B5A8A', marginBottom: 12 }}>What do you have in the fridge?</p>
        <input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="e.g. chicken, rice, tomatoes..."
          style={{ width: '100%', height: 44, borderRadius: 12, padding: '0 14px', fontSize: 14, background: 'rgba(255,255,255,0.6)', border: 'none', color: '#4A3A6A', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 13, color: '#6B5A8A', fontWeight: 500 }}>Serves:</span>
          <button onClick={() => setPeople((p) => Math.max(1, p - 1))} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.5)', border: 'none', fontSize: 16, color: '#4A3A6A', cursor: 'pointer' }}>−</button>
          <span style={{ fontWeight: 700, color: '#4A3A6A', minWidth: 20, textAlign: 'center' }}>{people}</span>
          <button onClick={() => setPeople((p) => Math.min(10, p + 1))} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.5)', border: 'none', fontSize: 16, color: '#4A3A6A', cursor: 'pointer' }}>+</button>
        </div>
        <button onClick={generateRecipe} disabled={loading || !ingredients.trim()}
          style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', background: loading || !ingredients.trim() ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)', color: '#4A3A6A', fontWeight: 600, fontSize: 14, cursor: loading || !ingredients.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <><Spinner />Finding recipe…</> : 'Generate Recipe'}
        </button>
      </div>

      {error && <div className="mx-4 mb-3 rounded-2xl px-4 py-3" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}><p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p></div>}

      {/* Generated recipe card */}
      {generated && (
        <div ref={resultRef} className="mx-4 mb-4 rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-3 mb-3">
            <span style={{ fontSize: 48, lineHeight: 1 }}>{generated.emoji}</span>
            <div className="flex-1">
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{generated.title}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span style={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9999, padding: '3px 10px', color: 'var(--text-secondary)' }}>⏱ {generated.prepTime}</span>
                <span style={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9999, padding: '3px 10px', color: 'var(--text-secondary)' }}>🔥 {generated.cookTime}</span>
                <span style={{ fontSize: 12, borderRadius: 9999, padding: '3px 10px', ...diffBadge(generated.difficulty), fontWeight: 500, textTransform: 'capitalize' }}>{generated.difficulty}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setDetailRecipe(generated); setDetailTab('ingredients'); }}
              style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #C4B8D8, #9B8CBD)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              View Full Recipe
            </button>
            <button onClick={() => { setDetailRecipe(generated); setDetailTab('cook'); }}
              style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #C4784A, #E8A87C)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              👨‍🍳 Cook Now
            </button>
          </div>
          {!savedId && (
            <button onClick={saveRecipe} style={{ width: '100%', marginTop: 8, height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
              Save Recipe ♡
            </button>
          )}
          {savedId && <p style={{ textAlign: 'center', fontSize: 13, color: '#4A7A58', marginTop: 8 }}>Saved ✓</p>}
        </div>
      )}

      {/* Saved recipes grid */}
      {savedRecipes.length > 0 && (
        <div className="px-4">
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Saved Recipes ({savedRecipes.length})</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {savedRecipes.map((recipe) => (
              <div key={recipe.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 12, position: 'relative' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>{recipe.emoji}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>{recipe.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>⏱ {recipe.prepTime}</p>
                <span style={{ fontSize: 10, borderRadius: 9999, padding: '2px 7px', ...diffBadge(recipe.difficulty), fontWeight: 500, display: 'inline-block', textTransform: 'capitalize' }}>{recipe.difficulty}</span>
                <div className="flex gap-1 mt-3">
                  <button onClick={() => { setDetailRecipe(recipe); setDetailTab('ingredients'); }}
                    style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>View</button>
                  <button onClick={() => { setDetailRecipe(recipe); setDetailTab('cook'); }}
                    style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', background: '#FFF0E0', color: '#C4784A', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cook</button>
                  <button onClick={() => deleteRecipe(recipe.id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg-primary)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {detailRecipe && (
        <RecipeDetailModal
          recipe={detailRecipe}
          initialTab={detailTab}
          onClose={() => { setDetailRecipe(null); }}
          onSave={'id' in detailRecipe ? undefined : () => { saveRecipe(); setDetailRecipe(null); }}
          userId={user?.id}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(100vh) rotate(720deg); } }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

export function KitchenScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<KitchenTab>('meals');

  const tabs: { key: KitchenTab; label: string }[] = [
    { key: 'meals',    label: t('kitchen.mealsTab') },
    { key: 'shopping', label: t('kitchen.shoppingTab') },
    { key: 'recipes',  label: t('kitchen.recipesTab') },
  ];

  return (
    <Layout background="url('/bg-kitchen.jpg') center/cover no-repeat">
      <div className="px-5 pt-5 pb-2">
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#3D2B1F', letterSpacing: '-0.01em', margin: 0 }}>{t('kitchen.title')}</h1>
      </div>
      <div className="flex mx-4 mt-3 rounded-2xl p-1 gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
            style={tab === tb.key ? { background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'meals'    && <MealsTab />}
      {tab === 'shopping' && <ShoppingTab />}
      {tab === 'recipes'  && <RecipesTab />}
    </Layout>
  );
}
