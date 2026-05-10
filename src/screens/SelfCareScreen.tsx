import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, parseISO } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/anthropic';
import { WorkoutDisplay } from '../components/fitness/WorkoutDisplay';
import type { SelfCareEntry } from '../types';

// ---------- localStorage helpers ----------
const WELLBEING_KEY = (userId: string) => `mm_wellbeing_${userId}`;
const SKINCARE_KEY = (userId: string) => `mm_skincare_${userId}`;

function loadWellbeing(userId: string): SelfCareEntry[] {
  try { return JSON.parse(localStorage.getItem(WELLBEING_KEY(userId)) || '[]'); } catch { return []; }
}
function saveWellbeing(userId: string, entries: SelfCareEntry[]) {
  localStorage.setItem(WELLBEING_KEY(userId), JSON.stringify(entries));
}
function loadSkincareRoutine(userId: string): string {
  return localStorage.getItem(SKINCARE_KEY(userId)) || '';
}
function saveSkincareRoutine(userId: string, routine: string) {
  localStorage.setItem(SKINCARE_KEY(userId), routine);
}

type SCTab = 'wellbeing' | 'nutrition' | 'gym' | 'skincare' | 'jurnal';

const MOODS = [
  { value: 1, emoji: '😢', labelKey: 'selfcare.terrible' },
  { value: 2, emoji: '😕', labelKey: 'selfcare.bad' },
  { value: 3, emoji: '😐', labelKey: 'selfcare.okay' },
  { value: 4, emoji: '😊', labelKey: 'selfcare.good' },
  { value: 5, emoji: '😁', labelKey: 'selfcare.great' },
];

const today = format(new Date(), 'yyyy-MM-dd');

// ---------- WELLBEING TAB ----------
function WellbeingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [entries, setEntries] = useState<SelfCareEntry[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    const all = loadWellbeing(user.id).filter((e) => e.date >= weekAgo);
    setEntries(all);
    const todayMood = all.find((e) => e.date === today && e.type === 'mood');
    const todayWater = all.find((e) => e.date === today && e.type === 'water');
    const todaySleep = all.find((e) => e.date === today && e.type === 'sleep');
    if (todayMood) setMood(todayMood.value ?? null);
    if (todayWater) setWater(todayWater.value ?? 0);
    if (todaySleep) setSleep(String(todaySleep.value ?? ''));
  }, [user]);

  function upsertLocal(userId: string, type: SelfCareEntry['type'], value?: number, notes?: string) {
    const all = loadWellbeing(userId);
    const existingIdx = all.findIndex((e) => e.date === today && e.type === type);
    let updated: SelfCareEntry[];
    if (existingIdx >= 0) {
      updated = all.map((e, i) => i === existingIdx ? { ...e, value, notes } : e);
    } else {
      const newEntry: SelfCareEntry = { id: crypto.randomUUID(), user_id: userId, type, value, notes, date: today, created_at: new Date().toISOString() };
      updated = [newEntry, ...all];
    }
    saveWellbeing(userId, updated);
    setEntries(updated.filter((e) => e.date >= format(subDays(new Date(), 6), 'yyyy-MM-dd')));
  }

  function saveAll() {
    if (!user) return;
    setSaving(true);
    if (mood !== null) upsertLocal(user.id, 'mood', mood);
    upsertLocal(user.id, 'water', water);
    if (sleep) upsertLocal(user.id, 'sleep', parseFloat(sleep));
    setSaving(false);
  }

  const weekEntries = entries.filter((e) => parseISO(e.date) >= subDays(new Date(), 6));
  const avgMood = avg(weekEntries.filter((e) => e.type === 'mood').map((e) => e.value ?? 0));
  const avgSleep = avg(weekEntries.filter((e) => e.type === 'sleep').map((e) => e.value ?? 0));
  const avgWater = avg(weekEntries.filter((e) => e.type === 'water').map((e) => e.value ?? 0));

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-6">
      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{t('selfcare.moodQuestion')}</h3>
        <div className="flex justify-between">
          {MOODS.map((m) => (
            <button key={m.value} onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${mood === m.value ? 'bg-[#E91E8C]/20 scale-110' : 'opacity-60 hover:opacity-100'}`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[9px] text-[var(--text-secondary)]">{t(m.labelKey)}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">💧 {t('selfcare.water')}</h3>
          <span className="text-xs text-[var(--text-secondary)]">{t('selfcare.waterGoal')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setWater((w) => Math.max(0, w - 1))} className="w-9 h-9 rounded-xl bg-[var(--bg-primary)] text-lg flex items-center justify-center active:scale-95">−</button>
          <div className="flex-1 flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setWater(i + 1)} className={`flex-1 h-7 rounded-lg transition-colors ${i < water ? 'bg-blue-400' : 'bg-[var(--bg-primary)]'}`} />
            ))}
          </div>
          <button onClick={() => setWater((w) => Math.min(8, w + 1))} className="w-9 h-9 rounded-xl bg-[var(--bg-primary)] text-lg flex items-center justify-center active:scale-95">+</button>
        </div>
        <p className="text-center text-xs text-[var(--text-secondary)] mt-2">{t('selfcare.glasses', { count: water })}</p>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">😴 {t('selfcare.sleep')}</h3>
        <div className="flex items-center gap-4">
          {[5, 6, 7, 8, 9].map((h) => (
            <button key={h} onClick={() => setSleep(String(h))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${sleep === String(h) ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {h}h
            </button>
          ))}
        </div>
      </Card>

      <Button size="lg" loading={saving} onClick={saveAll}>{t('selfcare.save')}</Button>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{t('selfcare.weekSummary')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('selfcare.avgMood'), value: avgMood ? MOODS[Math.round(avgMood) - 1]?.emoji : '—' },
            { label: t('selfcare.avgSleep'), value: avgSleep ? `${avgSleep.toFixed(1)}h` : '—' },
            { label: t('selfcare.avgWater'), value: avgWater ? `${avgWater.toFixed(1)}` : '—' },
          ].map((s) => (
            <Card key={s.label} className="text-center py-3">
              <div className="text-xl mb-1">{s.value}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- NUTRITION TAB ----------
const INPUT_CLS = 'w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C]';

function NutritionTab() {
  const { t, i18n } = useTranslation();
  const [goal, setGoal] = useState<'loss' | 'muscle'>('loss');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [planResult, setPlanResult] = useState<{ calories: number; text: string } | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) return;

    // Mifflin-St Jeor for women
    const bmr = 10 * w + 6.25 * h - 5 * a - 161;
    const calories = goal === 'loss'
      ? Math.round(bmr * 1.4 - 300)
      : Math.round(bmr * 1.5 + 300);

    setIsLoading(true);
    setError('');
    setPlanResult(null);

    try {
      const lang = i18n.language;
      const goalLabel = goal === 'loss' ? 'slăbire' : 'masă musculară';
      const prompt = `Sunt o femeie. Scopul meu este ${goalLabel}. Ținta mea zilnică de calorii este ${calories} kcal.

Generează un plan alimentar practic pentru o zi cu mic dejun, prânz, cină și o gustare. Include caloriile aproximative pentru fiecare masă.
Oferă și 3 sfaturi practice scurte pentru scopul meu.

Răspunde în EXACT acest format (fără text suplimentar înainte sau după):

Meniu zilnic

🌅 Mic dejun: [descriere] (~X kcal)
☀️ Prânz: [descriere] (~X kcal)
🍎 Gustare: [descriere] (~X kcal)
🌙 Cină: [descriere] (~X kcal)

Sfaturi pentru tine

1. [sfat]
2. [sfat]
3. [sfat]

IMPORTANT: Scrie în limba: ${lang}.`;

      const text = await askAI(prompt, 1000, lang);
      setPlanResult({ calories, text });
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-6">
      {/* Goal */}
      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">🎯 {t('selfcare.goal')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['loss', 'muscle'] as const).map((g) => (
            <button key={g} onClick={() => setGoal(g)}
              className={`py-3 rounded-2xl text-sm font-semibold transition-colors ${goal === g ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {g === 'loss' ? `⬇️ ${t('selfcare.weightLoss')}` : `💪 ${t('selfcare.muscleGain')}`}
            </button>
          ))}
        </div>
      </Card>

      {/* Measurements — explicit individual inputs to prevent focus loss */}
      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">📊 {t('selfcare.measurements')}</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">{t('selfcare.weight')} (kg)</label>
            <input type="number" inputMode="decimal" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="65" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">{t('selfcare.height')} (cm)</label>
            <input type="number" inputMode="decimal" value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="165" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">{t('selfcare.ageLabel')}</label>
            <input type="number" inputMode="decimal" value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30" className={INPUT_CLS} />
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
        >
          {isLoading ? '⏳ Se generează planul tău...' : `🔢 ${t('selfcare.calculatePlan')}`}
        </button>
      </Card>

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-6 h-6 rounded-full border-2 border-[#E91E8C] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Se generează planul tău...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <p className="text-sm text-red-400 text-center py-2">{error}</p>
        </Card>
      )}

      {/* Result */}
      {planResult && (
        <div className="flex flex-col gap-4">
          {/* Calorie banner */}
          <div className="bg-gradient-to-br from-[#E91E8C]/20 to-purple-600/10 rounded-3xl p-5 text-center border border-[#E91E8C]/30">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Planul tău zilnic</p>
            <p className="text-6xl font-black text-[#E91E8C] leading-none">{planResult.calories.toLocaleString()}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">kcal/zi</p>
            {goal === 'loss' ? (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-500/20 px-3 py-1 rounded-full">
                <span className="text-orange-400 text-xs font-bold">⬇️ Deficit caloric pentru slăbire</span>
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full">
                <span className="text-green-400 text-xs font-bold">⬆️ Surplus caloric pentru masă musculară</span>
              </div>
            )}
          </div>

          {/* AI-generated plan */}
          <Card>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{planResult.text}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------- GYM TAB ----------
type GymGoal = 'loss' | 'gain' | 'maintenance';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type WorkoutGoal = 'loss' | 'gain' | 'toning';
type WorkoutLocation = 'home' | 'gym';

type CalcResult = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  deficit: number | null;
  surplus: number | null;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function GymTab() {
  const { t, i18n } = useTranslation();

  // Calculator state
  const [gymGoal, setGymGoal] = useState<GymGoal>('loss');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // Meal plan state
  const [mealPlan, setMealPlan] = useState('');
  const [mealPlanLoading, setMealPlanLoading] = useState(false);

  // Workout state
  const [workoutLocation, setWorkoutLocation] = useState<WorkoutLocation>('gym');
  const [workoutGoal, setWorkoutGoal] = useState<WorkoutGoal>('loss');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [workoutPlan, setWorkoutPlan] = useState('');
  const [workoutLoading, setWorkoutLoading] = useState(false);

  function calculate() {
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    if (!w || !h || !a) return;

    const bmr = Math.round(10 * w + 6.25 * h - 5 * a - 161);
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);

    let targetCalories: number;
    let deficit: number | null = null;
    let surplus: number | null = null;

    if (gymGoal === 'loss') {
      deficit = 400;
      targetCalories = tdee - deficit;
    } else if (gymGoal === 'gain') {
      surplus = 250;
      targetCalories = tdee + surplus;
    } else {
      targetCalories = tdee;
    }

    const protein = gymGoal === 'gain' ? Math.round(w * 2.2) : Math.round(w * 1.8);
    const fat = Math.round((targetCalories * 0.25) / 9);
    const carbs = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

    setCalcResult({ bmr, tdee, targetCalories: Math.round(targetCalories), protein, carbs, fat, deficit, surplus });
  }

  async function generateMealPlan() {
    if (!calcResult) return;
    setMealPlanLoading(true);
    const lang = i18n.language;
    const goalLabel = gymGoal === 'loss' ? 'weight loss (caloric deficit)' : gymGoal === 'gain' ? 'muscle gain (caloric surplus)' : 'maintenance';
    const tw = parseFloat(targetWeight);
    try {
      const prompt = `Create a strict 5-day meal plan for ${goalLabel}.
Daily targets: ${calcResult.targetCalories} kcal, ${calcResult.protein}g protein, ${calcResult.carbs}g carbs, ${calcResult.fat}g fat.
${tw ? `Current weight: ${weight}kg → Target: ${tw}kg.` : ''}
${gymGoal === 'gain' ? 'High protein meals, caloric surplus focus.' : gymGoal === 'loss' ? 'Low calorie, high volume, filling foods.' : 'Balanced macros.'}
For each of the 5 days show:
- Breakfast (with exact kcal)
- Morning Snack (with exact kcal)
- Lunch (with exact kcal)
- Afternoon Snack (with exact kcal)
- Dinner (with exact kcal)
- Total daily kcal
Use simple, common supermarket ingredients. Include portion sizes.
IMPORTANT: Respond entirely in the following language: ${lang}.`;
      const result = await askAI(prompt, 3000, lang);
      setMealPlan(result);
    } catch { /* silent */ } finally {
      setMealPlanLoading(false);
    }
  }

  async function generateWorkoutPlan() {
    setWorkoutLoading(true);
    const lang = i18n.language;
    const goalLabel = workoutGoal === 'loss' ? 'weight loss' : workoutGoal === 'gain' ? 'muscle gain' : 'toning';
    try {
      const prompt = `Create a ${daysPerWeek}-day per week ${goalLabel} workout plan for ${workoutLocation === 'home' ? 'home (no equipment or minimal equipment)' : 'gym (full equipment available)'}.
For each training day, provide:
- Day name and muscle groups targeted
- Warm-up (5-10 min)
- Main workout: each exercise with sets × reps, rest time between sets
- Progressive overload tip
- Cool-down (5 min)
Make it motivating and professional. Include rest day guidance.
IMPORTANT: Respond entirely in the following language: ${lang}.`;
      const result = await askAI(prompt, 3000, lang);
      setWorkoutPlan(result);
    } catch { /* silent */ } finally {
      setWorkoutLoading(false);
    }
  }

  const activityOptions: { key: ActivityLevel; label: string }[] = [
    { key: 'sedentary', label: t('selfcare.sedentary') },
    { key: 'light', label: t('selfcare.lightActivity') },
    { key: 'moderate', label: t('selfcare.moderateActivity') },
    { key: 'active', label: t('selfcare.activeLevel') },
    { key: 'very_active', label: t('selfcare.veryActive') },
  ];

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-6">

      {/* ── CALORIE CALCULATOR ── */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔥</span>
        <h2 className="text-base font-bold text-[var(--text-primary)]">{t('selfcare.calorieCalculator')}</h2>
      </div>

      {/* Goal */}
      <Card>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">🎯 {t('selfcare.goal')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['loss', 'gain', 'maintenance'] as GymGoal[]).map((g) => (
            <button key={g} onClick={() => setGymGoal(g)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymGoal === g ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {g === 'loss' ? `⬇️ ${t('selfcare.weightLoss')}` : g === 'gain' ? `💪 ${t('selfcare.muscleGain')}` : `⚖️ ${t('selfcare.maintenance')}`}
            </button>
          ))}
        </div>
      </Card>

      {/* Measurements */}
      <Card>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">📊 {t('selfcare.measurements')}</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: t('selfcare.weight'), val: weight, set: setWeight, ph: '70' },
            { label: t('selfcare.targetWeight'), val: targetWeight, set: setTargetWeight, ph: '60' },
            { label: t('selfcare.height'), val: height, set: setHeight, ph: '165' },
            { label: t('selfcare.ageLabel'), val: age, set: setAge, ph: '30' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
              <input type="number" inputMode="numeric" value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C]" />
            </div>
          ))}
        </div>

        {/* Activity Level */}
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">🏃 {t('selfcare.activityLevel')}</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activityOptions.map(({ key, label }) => (
            <button key={key} onClick={() => setActivity(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${activity === key ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button onClick={calculate} className="w-full py-3 rounded-2xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}>
          🔢 {t('selfcare.calculate')}
        </button>
      </Card>

      {/* Results */}
      {calcResult && (
        <>
          {/* Big calorie number */}
          <div className="bg-gradient-to-br from-[#E91E8C]/20 to-purple-600/10 rounded-3xl p-5 text-center border border-[#E91E8C]/30">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{t('selfcare.targetCaloriesLabel')}</p>
            <p className="text-6xl font-black text-[#E91E8C] leading-none">{calcResult.targetCalories}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">kcal</p>
            {calcResult.deficit && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-500/20 px-3 py-1 rounded-full">
                <span className="text-orange-400 text-xs font-bold">⬇️ -{calcResult.deficit} kcal {t('selfcare.dailyDeficit')}</span>
              </div>
            )}
            {calcResult.surplus && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full">
                <span className="text-green-400 text-xs font-bold">⬆️ +{calcResult.surplus} kcal {t('selfcare.dailySurplus')}</span>
              </div>
            )}
          </div>

          {/* BMR / TDEE */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">{t('selfcare.bmrLabel')}</p>
              <p className="text-3xl font-black text-blue-400">{calcResult.bmr}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">kcal</p>
            </Card>
            <Card className="text-center py-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">{t('selfcare.tdeeLabel')}</p>
              <p className="text-3xl font-black text-purple-400">{calcResult.tdee}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">kcal</p>
            </Card>
          </div>

          {/* Macros */}
          <Card>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">🥩 {t('selfcare.dailyTargets')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('selfcare.protein'), value: calcResult.protein, unit: 'g', color: '#3b82f6' },
                { label: t('selfcare.carbs'), value: calcResult.carbs, unit: 'g', color: '#f59e0b' },
                { label: t('selfcare.fat'), value: calcResult.fat, unit: 'g', color: '#22c55e' },
              ].map((m) => (
                <div key={m.label} className="bg-[var(--bg-primary)] rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{m.unit}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ── MEAL PLAN ── */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg">🥗</span>
            <h2 className="text-base font-bold text-[var(--text-primary)]">{t('selfcare.mealPlanSection')}</h2>
          </div>

          <button onClick={generateMealPlan} disabled={mealPlanLoading} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}>
            {mealPlanLoading ? '⏳ ' + t('common.loading') : `🍽️ ${t('selfcare.generateDietPlan')}`}
          </button>

          {mealPlan && (
            <Card>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{mealPlan}</p>
            </Card>
          )}
        </>
      )}

      {/* ── WORKOUT PLAN ── */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-lg">🏋️</span>
        <h2 className="text-base font-bold text-[var(--text-primary)]">{t('selfcare.workoutSection')}</h2>
      </div>

      <Card>
        {/* Location */}
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">📍 {t('kids.location')}</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['home', 'gym'] as WorkoutLocation[]).map((loc) => (
            <button key={loc} onClick={() => setWorkoutLocation(loc)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${workoutLocation === loc ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {loc === 'home' ? `🏠 ${t('selfcare.homeWorkout')}` : `🏋️ ${t('selfcare.gymLocation')}`}
            </button>
          ))}
        </div>

        {/* Workout Goal */}
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">🎯 {t('selfcare.goal')}</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['loss', 'gain', 'toning'] as WorkoutGoal[]).map((g) => (
            <button key={g} onClick={() => setWorkoutGoal(g)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${workoutGoal === g ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {g === 'loss' ? `🔥 ${t('selfcare.weightLoss')}` : g === 'gain' ? `💪 ${t('selfcare.muscleGain')}` : `✨ ${t('selfcare.toningGoal')}`}
            </button>
          ))}
        </div>

        {/* Days/Week */}
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">📅 {t('selfcare.daysPerWeek')}</h3>
        <div className="flex gap-2 mb-4">
          {[3, 4, 5].map((d) => (
            <button key={d} onClick={() => setDaysPerWeek(d)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${daysPerWeek === d ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
            >
              {d}
            </button>
          ))}
        </div>

        <button onClick={generateWorkoutPlan} disabled={workoutLoading} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}>
          {workoutLoading ? '⏳ ' + t('common.loading') : `💪 ${t('selfcare.generateWorkoutPlan')}`}
        </button>
      </Card>

      {workoutPlan && (
        <div>
          <WorkoutDisplay plan={workoutPlan} />
        </div>
      )}
    </div>
  );
}

// ---------- SKINCARE TAB ----------
function SkincareTab() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [skinType, setSkinType] = useState('');
  const [season, setSeason] = useState('');
  const [concern, setConcern] = useState('');
  const [routine, setRoutine] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const savedRoutine = loadSkincareRoutine(user.id);
    if (savedRoutine) setRoutine(savedRoutine);
  }, [user]);

  async function generateRoutine() {
    if (!skinType || !season) return;
    setLoading(true);
    setSaved(false);
    try {
      const lang = i18n.language;
      const prompt = `Generate a complete, professional skincare routine for:
- Skin type: ${skinType}
- Season: ${season}${concern ? `\n- Main concern: ${concern}` : ''}

Structure the routine as follows:

☀️ MORNING ROUTINE:
Step 1: Cleanser → Step 2: Toner → Step 3: Serum → Step 4: Moisturiser → Step 5: SPF

🌙 EVENING ROUTINE:
Step 1: Cleanser → Step 2: Treatment/Actives → Step 3: Serum → Step 4: Night cream/Moisturiser

📅 WEEKLY TREATMENTS:
- Exfoliation (frequency + method)
- Face mask (type + frequency)

✅ KEY INGREDIENTS TO LOOK FOR (list 5-6 specific ingredients and why)

❌ INGREDIENTS TO AVOID for this skin type (list 4-5 with reasons)

💊 BUDGET RECOMMENDATIONS:
- Drugstore picks (under £15 per product)
- Mid-range picks (£15-40)

Be specific with product types. Make it practical and motivating.
IMPORTANT: Write the entire response in the following language: ${lang}. Respond entirely in that language.`;
      const result = await askAI(prompt, 3000, lang);
      setRoutine(result);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  function saveRoutine() {
    if (!user || !routine) return;
    saveSkincareRoutine(user.id, routine);
    setSaved(true);
  }

  const skinTypes = [t('selfcare.oily'), t('selfcare.dry'), t('selfcare.combination'), t('selfcare.sensitive'), t('selfcare.normal')];
  const seasons = [t('selfcare.spring'), t('selfcare.summer'), t('selfcare.autumn'), t('selfcare.winter')];
  const concerns = [t('selfcare.acne'), t('selfcare.aging'), t('selfcare.pigmentation'), t('selfcare.drynessConcern'), t('selfcare.sensitivityConcern')];

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-6">
      <Card>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">✨ {t('selfcare.skinType')}</h3>
        <div className="flex flex-wrap gap-2">
          {skinTypes.map((st) => (
            <button key={st} onClick={() => setSkinType(st)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${skinType === st ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>
              {st}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">🌸 {t('selfcare.season')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {seasons.map((s) => (
            <button key={s} onClick={() => setSeason(s)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${season === s ? 'bg-[#E91E8C] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">🔍 {t('selfcare.concern')}</h3>
        <div className="flex flex-wrap gap-2">
          {concerns.map((c) => (
            <button key={c} onClick={() => setConcern(concern === c ? '' : c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${concern === c ? 'bg-purple-500 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>
              {c}
            </button>
          ))}
        </div>
      </Card>

      <button onClick={generateRoutine} disabled={loading || !skinType || !season} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}>
        {loading ? '⏳ ' + t('common.loading') : `✨ ${t('selfcare.generateSkincare')}`}
      </button>

      {routine && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">🌿 Your Routine</h3>
            <button onClick={saveRoutine}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-[#E91E8C]/20 text-[#E91E8C]'}`}>
              {saved ? '✓ Saved' : `💾 ${t('selfcare.saveRoutine')}`}
            </button>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{routine}</p>
        </Card>
      )}

      {!routine && user && loadSkincareRoutine(user.id) && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">💾 {t('selfcare.savedRoutine')}</h3>
            <button onClick={() => setRoutine(loadSkincareRoutine(user.id))}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#E91E8C]/20 text-[#E91E8C]">
              {t('selfcare.loadSaved')}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------- JURNAL TAB ----------
type JournalEntry = { date: string; mood: number | null; notes: string };
const JOURNAL_KEY = 'mm_journal';
function loadJournal(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); } catch { return []; }
}

function JurnalTab() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<JournalEntry[]>(loadJournal);
  const [selectedDate, setSelectedDate] = useState(today);
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const entry = entries.find((e) => e.date === selectedDate);
    setMood(entry?.mood ?? null);
    setNotes(entry?.notes ?? '');
  }, [selectedDate, entries]);

  function saveEntry() {
    const updated = entries.filter((e) => e.date !== selectedDate);
    if (notes.trim() || mood !== null) updated.push({ date: selectedDate, mood, notes: notes.trim() });
    updated.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(updated);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  }

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-6">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">📅 {t('selfcare.jurnalDate')}</h3>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[var(--bg-primary)] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#E91E8C]" />
        </div>
        <h4 className="text-xs text-[var(--text-secondary)] mb-2">{t('selfcare.moodQuestion')}</h4>
        <div className="flex justify-between mb-3">
          {MOODS.map((m) => (
            <button key={m.value} onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${mood === m.value ? 'bg-[#E91E8C]/20 scale-110' : 'opacity-60 hover:opacity-100'}`}>
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[9px] text-[var(--text-secondary)]">{t(m.labelKey)}</span>
            </button>
          ))}
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('selfcare.jurnalPlaceholder')} rows={4} />
        <Button className="w-full mt-3" onClick={saveEntry}>{t('selfcare.saveEntry')}</Button>
      </Card>
      {entries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{t('selfcare.pastEntries')}</h3>
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.date} onClick={() => setSelectedDate(entry.date)}
              className="bg-[var(--bg-card)] rounded-2xl p-3 mb-2 flex items-start gap-3 cursor-pointer active:opacity-80">
              <span className="text-xl">{entry.mood ? MOODS[entry.mood - 1]?.emoji : '📓'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-0.5">{format(parseISO(entry.date), 'EEEE, d MMM yyyy')}</p>
                {entry.notes && <p className="text-sm text-[var(--text-primary)] line-clamp-2">{entry.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- MAIN ----------
export function SelfCareScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SCTab>('wellbeing');

  const tabs: { key: SCTab; label: string }[] = [
    { key: 'wellbeing', label: t('selfcare.wellbeingTab') },
    { key: 'nutrition', label: t('selfcare.nutritionTab') },
    { key: 'gym', label: t('selfcare.gymTab') },
    { key: 'skincare', label: t('selfcare.skincareTab') },
    { key: 'jurnal', label: t('selfcare.jurnalTab') },
  ];

  return (
    <Layout>
      <Header title={t('selfcare.title')} />
      <div className="flex mx-4 mt-3 bg-[var(--bg-card)] rounded-2xl p-1 gap-0.5 overflow-x-auto no-scrollbar">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-shrink-0 flex-1 py-2 rounded-xl text-[9px] font-semibold transition-colors leading-tight whitespace-nowrap px-1 ${
              tab === tb.key ? 'bg-[#E91E8C] text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'wellbeing' && <WellbeingTab />}
      {tab === 'nutrition' && <NutritionTab />}
      {tab === 'gym' && <GymTab />}
      {tab === 'skincare' && <SkincareTab />}
      {tab === 'jurnal' && <JurnalTab />}
    </Layout>
  );
}

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
