import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInYears, parseISO, format } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { LuxuryScreenHeader } from '../components/ui/LuxuryScreenHeader';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { askAIStream } from '../lib/anthropic';
import { ActivitiesGenerator } from '../components/kids/ActivitiesGenerator';
import type { Kid, KidMilestone } from '../types';

const AVATARS = ['👧', '👦', '👶'];

const milestoneColors: Record<KidMilestone['category'], string> = {
  health: '#ef4444',
  school: '#3b82f6',
  activity: '#f59e0b',
  firstTime: '#C4788A',
};

const SCHOOL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

type SchoolMealDay = { main: string; snack: string; drink: string; fruit: string };
type SchoolMealPlan = Record<string, SchoolMealDay>;

type Activity = { id: string; name: string; day: string; time: string; location: string };

type LunchBoxItem = { id: string; name: string; checked: boolean };

type KidTab = 'activityGen' | 'mealPlans' | 'schoolMeals' | 'activities' | 'milestones' | 'lunchbox';

// ---------- AGE-BASED MEAL PLANS ----------
type AgeGroup = 'baby' | 'toddler' | 'preschool' | 'school';

type MealDetail = {
  meal: string;
  description: string;
  prepTime?: string;
  ingredients?: string[];
  steps?: string[];
  textureTip?: string;
};

type MealPlanDay = {
  day: string;
  breakfast: MealDetail;
  lunch: MealDetail;
  dinner: MealDetail;
  snacks: string[];
};

type AgeMealPlan = { days: MealPlanDay[] };

const AGE_GROUPS: { key: AgeGroup; emoji: string; label: string; prompt: string }[] = [
  {
    key: 'baby', emoji: '👶', label: 'Baby (0-2y)',
    prompt: 'Create a 7-day weaning meal plan for an 8-month-old baby. Include breakfast, lunch and dinner. Focus on age-appropriate foods, texture progression, allergen introduction. Include portion sizes in teaspoons/tablespoons. No salt, no sugar, no honey.',
  },
  {
    key: 'toddler', emoji: '🧒', label: 'Toddler (2-4y)',
    prompt: 'Create a varied 7-day meal plan for a 2-4 year old toddler. Include breakfast, snack, lunch, snack, dinner. Focus on nutrients, finger foods, family meals adapted. Calories approx 1000-1400/day.',
  },
  {
    key: 'preschool', emoji: '🎨', label: 'Pre-School (4-7y)',
    prompt: 'Create a 7-day meal plan for a 4-7 year old child. Include breakfast, packed lunch ideas, dinner, snacks. Approx 1200-1600 kcal/day. Varied, nutritious, child-friendly.',
  },
  {
    key: 'school', emoji: '🏫', label: 'School Age (7-10y)',
    prompt: 'Create a 7-day meal plan for a 7-10 year old. Include breakfast, school packed lunch, after-school snack, dinner. Approx 1400-1800 kcal/day.',
  },
];

function getCurrentWeekNum(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekOfYear = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return ((weekOfYear - 1) % 4) + 1;
}

const MP_KEY = (kidId: string, ageGroup: AgeGroup, week: number) => `mm_mealplan_${kidId}_${ageGroup}_w${week}`;

// ---------- localStorage helpers ----------
const KIDS_KEY = (userId: string) => `mm_kids_${userId}`;
const MILESTONES_KEY = (kidId: string) => `mm_milestones_${kidId}`;

function loadKids(userId: string): Kid[] {
  try { return JSON.parse(localStorage.getItem(KIDS_KEY(userId)) || '[]'); } catch { return []; }
}
function saveKids(userId: string, kids: Kid[]) {
  localStorage.setItem(KIDS_KEY(userId), JSON.stringify(kids));
}
function loadMilestonesLocal(kidId: string): KidMilestone[] {
  try { return JSON.parse(localStorage.getItem(MILESTONES_KEY(kidId)) || '[]'); } catch { return []; }
}
function saveMilestonesLocal(kidId: string, ms: KidMilestone[]) {
  localStorage.setItem(MILESTONES_KEY(kidId), JSON.stringify(ms));
}
function loadSchoolMeals(kidId: string): SchoolMealPlan {
  try { return JSON.parse(localStorage.getItem(`mm_school_meals_${kidId}`) || 'null') || {}; } catch { return {}; }
}
function loadActivities(kidId: string): Activity[] {
  try { return JSON.parse(localStorage.getItem(`mm_activities_${kidId}`) || 'null') || []; } catch { return []; }
}
function saveActivities(kidId: string, acts: Activity[]) {
  localStorage.setItem(`mm_activities_${kidId}`, JSON.stringify(acts));
}
function loadLunchBox(kidId: string, date: string): LunchBoxItem[] {
  try { return JSON.parse(localStorage.getItem(`mm_lunchbox_${kidId}_${date}`) || '[]'); } catch { return []; }
}
function saveLunchBox(kidId: string, date: string, items: LunchBoxItem[]) {
  localStorage.setItem(`mm_lunchbox_${kidId}_${date}`, JSON.stringify(items));
}

// ---------- MILESTONES TAB ----------
function MilestonesTab({ kid: _kid, milestones, onAddMilestone, onDeleteMilestone }: {
  kid: Kid;
  milestones: KidMilestone[];
  onAddMilestone: () => void;
  onDeleteMilestone: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('kids.milestones')}</h4>
        <Button size="sm" onClick={onAddMilestone}>+ {t('kids.addMilestone')}</Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">{t('kids.noMilestones')}</p>
      ) : (
        milestones.map((m) => (
          <div key={m.id} className="bg-[var(--bg-card)] rounded-2xl p-3 mb-2 flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: milestoneColors[m.category] }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{m.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={milestoneColors[m.category]}>{t(`kids.${m.category}`)}</Badge>
                <span className="text-xs text-[var(--text-secondary)]">{format(parseISO(m.date), 'MMM d, yyyy')}</span>
              </div>
              {m.notes && <p className="text-xs text-[var(--text-secondary)] mt-1">{m.notes}</p>}
            </div>
            <button onClick={() => onDeleteMilestone(m.id)} className="text-[var(--text-secondary)] hover:text-red-400 text-sm">✕</button>
          </div>
        ))
      )}
    </div>
  );
}

// ---------- SCHOOL MEALS TAB ----------
function SchoolMealsTab({ kid }: { kid: Kid }) {
  const { t, i18n } = useTranslation();
  const [plan, setPlan] = useState<SchoolMealPlan>(() => loadSchoolMeals(kid.id));
  const [generating, setGenerating] = useState(false);

  async function generateSchoolMenu() {
    setGenerating(true);
    try {
      const age = differenceInYears(new Date(), parseISO(kid.birthdate));
      const prompt = `Generate a 5-day healthy school packed lunch menu for a ${age}-year-old child named ${kid.name}.
Use simple, nutritious ingredients. UK school lunchbox style.
Return ONLY a JSON object:
{
  "monday": {"main": "...", "snack": "...", "drink": "...", "fruit": "..."},
  "tuesday": {"main": "...", "snack": "...", "drink": "...", "fruit": "..."},
  "wednesday": {"main": "...", "snack": "...", "drink": "...", "fruit": "..."},
  "thursday": {"main": "...", "snack": "...", "drink": "...", "fruit": "..."},
  "friday": {"main": "...", "snack": "...", "drink": "...", "fruit": "..."}
}
Examples: main="Cheese sandwich", snack="Rice cakes", drink="Water bottle", fruit="Apple"
Respond only in English.`;
      let raw = '';
      await askAIStream(prompt, 1024, i18n.language, (chunk) => { raw += chunk; });
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed: SchoolMealPlan = JSON.parse(match[0]);
        setPlan(parsed);
        localStorage.setItem(`mm_school_meals_${kid.id}`, JSON.stringify(parsed));
      }
    } catch { /* silent */ } finally {
      setGenerating(false);
    }
  }

  const mealEmoji = { main: '🥪', snack: '🍪', drink: '💧', fruit: '🍎' };

  return (
    <div>
      <button
        onClick={generateSchoolMenu}
        disabled={generating}
        className="w-full py-3 rounded-2xl font-semibold text-white mb-4 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' }}
      >
        {generating ? t('kitchen.generating') : t('kids.generateSchoolMenu')}
      </button>
      {Object.keys(plan).length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] text-sm py-4">{t('kids.noSchoolMeals')}</p>
      ) : (
        SCHOOL_DAYS.map((day) => {
          const meals = plan[day];
          if (!meals) return null;
          return (
            <Card key={day} className="mb-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 capitalize">{t(`kitchen.${day}`)}</h4>
              <div className="grid grid-cols-2 gap-2">
                {(['main', 'snack', 'drink', 'fruit'] as const).map((type) => (
                  <div key={type} className="bg-[var(--bg-primary)] rounded-xl p-2">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-0.5">
                      {mealEmoji[type]} {t(`kids.${type}`)}
                    </div>
                    <div className="text-xs text-[var(--text-primary)]">{meals[type] || '—'}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ---------- ACTIVITIES TAB ----------
const WEEK_DAYS_ALL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function ActivitiesTab({ kid }: { kid: Kid }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>(() => loadActivities(kid.id));
  const [showForm, setShowForm] = useState(false);
  const [actName, setActName] = useState('');
  const [actDay, setActDay] = useState('monday');
  const [actTime, setActTime] = useState('');
  const [actLocation, setActLocation] = useState('');

  function addActivity() {
    if (!actName.trim()) return;
    const newAct: Activity = { id: crypto.randomUUID(), name: actName.trim(), day: actDay, time: actTime, location: actLocation.trim() };
    const updated = [...activities, newAct];
    setActivities(updated);
    saveActivities(kid.id, updated);
    setActName(''); setActTime(''); setActLocation('');
    setShowForm(false);
  }

  function deleteActivity(id: string) {
    const updated = activities.filter((a) => a.id !== id);
    setActivities(updated);
    saveActivities(kid.id, updated);
  }

  const dayOptions = WEEK_DAYS_ALL.map((d) => ({ value: d, label: t(`kitchen.${d}`) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('kids.activities')}</h4>
        <Button size="sm" onClick={() => setShowForm(true)}>+ {t('kids.addActivity')}</Button>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">{t('kids.noActivities')}</p>
      ) : (
        WEEK_DAYS_ALL.map((day) => {
          const dayActs = activities.filter((a) => a.day === day);
          if (dayActs.length === 0) return null;
          return (
            <div key={day} className="mb-3">
              <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">{t(`kitchen.${day}`)}</h5>
              {dayActs.map((act) => (
                <div key={act.id} className="bg-[var(--bg-card)] rounded-2xl px-4 py-3 mb-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'var(--accent-soft)' }}>🏃</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{act.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {act.time && `${act.time}${act.location ? ` · ${act.location}` : ''}`}
                      {!act.time && act.location}
                    </p>
                  </div>
                  <button onClick={() => deleteActivity(act.id)} className="text-[var(--text-secondary)] hover:text-red-400 text-sm p-1">✕</button>
                </div>
              ))}
            </div>
          );
        })
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('kids.addActivity')}>
        <div className="flex flex-col gap-4">
          <Input label={t('kids.activityName')} value={actName} onChange={(e) => setActName(e.target.value)} placeholder="Swimming" />
          <Select label={t('kids.day')} value={actDay} options={dayOptions} onChange={(e) => setActDay(e.target.value)} />
          <Input label={t('kids.time')} type="time" value={actTime} onChange={(e) => setActTime(e.target.value)} />
          <Input label={t('kids.location')} value={actLocation} onChange={(e) => setActLocation(e.target.value)} placeholder="Sports Centre" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>{t('kids.cancel')}</Button>
            <Button className="flex-1" onClick={addActivity}>{t('kids.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- LUNCH BOX TAB ----------
const LUNCH_PRESETS = ['🥪 Sandwich', '🍎 Fruit', '💧 Water', '🍪 Snack', '🥕 Veggies', '🧃 Juice', '🧀 Cheese', '🥜 Nuts'];

function LunchBoxTab({ kid }: { kid: Kid }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [items, setItems] = useState<LunchBoxItem[]>(() => loadLunchBox(kid.id, today));
  const [custom, setCustom] = useState('');

  function save(updated: LunchBoxItem[]) {
    setItems(updated);
    saveLunchBox(kid.id, today, updated);
  }

  function toggle(id: string) {
    save(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  }

  function addPreset(name: string) {
    if (items.some((i) => i.name === name)) return;
    save([...items, { id: crypto.randomUUID(), name, checked: false }]);
  }

  function addCustom() {
    if (!custom.trim()) return;
    save([...items, { id: crypto.randomUUID(), name: custom.trim(), checked: false }]);
    setCustom('');
  }

  function removeItem(id: string) {
    save(items.filter((i) => i.id !== id));
  }

  const packed = items.filter((i) => i.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-secondary)]">🍱 Lunch Box</h4>
        <span className="text-xs text-[var(--text-secondary)]">
          {format(new Date(), 'MMM d')} · {packed}/{items.length} packed
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {LUNCH_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => addPreset(p)}
            disabled={items.some((i) => i.name === p)}
            className="px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-35 transition-opacity"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom add */}
      <div className="flex gap-2 mb-4">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Add custom item..."
          className="flex-1 rounded-xl px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] outline-none"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={addCustom}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' }}
        >
          +
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">Add items from presets above</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl px-4 py-3 mb-2">
            <button
              onClick={() => toggle(item.id)}
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            style={item.checked ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : { borderColor: 'var(--border-strong)' }}
            >
              {item.checked && <span className="text-white text-[10px] font-bold">✓</span>}
            </button>
            <span
              className={`flex-1 text-sm transition-colors ${
                item.checked ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {item.name}
            </span>
            <button onClick={() => removeItem(item.id)} className="text-[var(--text-secondary)] hover:text-red-400 text-sm p-1">✕</button>
          </div>
        ))
      )}
    </div>
  );
}

// ---------- AGE MEAL PLAN TAB ----------
function AgeMealPlanTab({ kid }: { kid: Kid }) {
  const { i18n } = useTranslation();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('toddler');
  const weekNum = getCurrentWeekNum();
  const [plan, setPlan] = useState<AgeMealPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['Monday']));
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(MP_KEY(kid.id, ageGroup, weekNum));
    if (saved) { try { setPlan(JSON.parse(saved)); } catch { setPlan(null); } }
    else setPlan(null);
  }, [kid.id, ageGroup, weekNum]);

  async function generatePlan() {
    setGenerating(true);
    setAiError('');
    const groupInfo = AGE_GROUPS.find(g => g.key === ageGroup)!;
    const isBaby = ageGroup === 'baby';
    const prompt = `${groupInfo.prompt}

Format as JSON with this exact structure (include ALL fields for each meal):
{
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "meal": "...",
        "description": "...",
        "prepTime": "5 min",
        "ingredients": ["100g oats", "200ml whole milk"],
        "steps": ["Step 1...", "Step 2...", "Step 3..."]${isBaby ? ',\n        "textureTip": "Blend until smooth"' : ''}
      },
      "lunch": { "meal": "...", "description": "...", "prepTime": "...", "ingredients": ["..."], "steps": ["..."]${isBaby ? ', "textureTip": "..."' : ''} },
      "dinner": { "meal": "...", "description": "...", "prepTime": "...", "ingredients": ["..."], "steps": ["..."]${isBaby ? ', "textureTip": "..."' : ''} },
      "snacks": ["...", "..."]
    }
  ]
}
Include all 7 days (Monday to Sunday). Use UK measurements (grams, ml). Respond ONLY with valid JSON, no extra text.`;

    try {
      let raw = '';
      await askAIStream(prompt, 2048, i18n.language, (chunk) => { raw += chunk; });
      raw = raw.replace(/```json|```/g, '').trim();
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const parsed: AgeMealPlan = JSON.parse(raw.slice(start, end + 1));
        setPlan(parsed);
        localStorage.setItem(MP_KEY(kid.id, ageGroup, weekNum), JSON.stringify(parsed));
      } else {
        setAiError('Could not parse meal plan. Please try again.');
      }
    } catch { setAiError('Could not generate meal plan. Try again.'); }
    finally { setGenerating(false); }
  }

  function toggleDay(day: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const MEAL_EMOJIS = { breakfast: '🌅', lunch: '🍱', dinner: '🌙' };
  const selectedGroup = AGE_GROUPS.find(g => g.key === ageGroup)!;

  return (
    <div>
      {/* Age group selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {AGE_GROUPS.map(g => (
          <button
            key={g.key}
            onClick={() => setAgeGroup(g.key)}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: ageGroup === g.key ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'var(--bg-card)',
              color: ageGroup === g.key ? '#fff' : 'var(--text-secondary)',
              border: ageGroup === g.key ? 'none' : '1px solid var(--border)',
            }}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {/* Week indicator + generate button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: '6px 12px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>📅 Week {weekNum} of 4</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Resets Mondays</span>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating}
          style={{
            padding: '8px 14px', borderRadius: 14, fontSize: 12, fontWeight: 700,
            background: generating ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: generating ? 'var(--text-secondary)' : '#fff',
            border: 'none', opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? '⏳ Generating...' : '🔄 New Menu'}
        </button>
      </div>

      {aiError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#DC2626' }}>
          {aiError}
        </div>
      )}

      {!plan ? (
        <div style={{ border: '2px dashed var(--border)', borderRadius: 20, padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{selectedGroup.emoji}</div>
          <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{selectedGroup.label}</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Tap Generate to create a personalised 7-day meal plan</p>
          <button
            onClick={generatePlan}
            disabled={generating}
            style={{
              padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: '#fff', border: 'none',
            }}
          >
            {generating ? '⏳ Generating...' : '🔄 Generate Meal Plan'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plan.days.map(dayPlan => {
            const expanded = expandedDays.has(dayPlan.day);
            return (
              <motion.div key={dayPlan.day} style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleDay(dayPlan.day)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{dayPlan.day}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(['breakfast', 'lunch', 'dinner'] as const).map(mealKey => {
                          const m = dayPlan[mealKey];
                          const mealId = `${dayPlan.day}-${mealKey}`;
                          const isExpMeal = expandedMeal === mealId;
                          return (
                            <div key={mealKey} style={{ background: 'var(--bg-primary)', borderRadius: 14, overflow: 'hidden' }}>
                              {/* Meal header — tap to expand */}
                              <button onClick={() => setExpandedMeal(isExpMeal ? null : mealId)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{MEAL_EMOJIS[mealKey]}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{mealKey}</span>
                                    {m.prepTime && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>· ⏱ {m.prepTime}</span>}
                                  </div>
                                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.meal}</p>
                                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.description}</p>
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                  {isExpMeal ? '▲' : '▼'}
                                </span>
                              </button>

                              {/* Expandable prep */}
                              <AnimatePresence>
                                {isExpMeal && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {/* Texture tip for babies */}
                                      {m.textureTip && (
                                        <div style={{ background: '#FFF8E6', borderRadius: 10, padding: '7px 10px' }}>
                                          <p style={{ fontSize: 11, color: '#B8860B', fontWeight: 600 }}>👶 Texture: {m.textureTip}</p>
                                        </div>
                                      )}

                                      {/* Ingredients */}
                                      {m.ingredients && m.ingredients.length > 0 && (
                                        <div>
                                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 5 }}>Ingredients</p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                                            {m.ingredients.map((ing, j) => (
                                              <span key={j} style={{ fontSize: 11, background: '#EDF5ED', color: '#4A7A58', borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{ing}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Steps */}
                                      {m.steps && m.steps.length > 0 && (
                                        <div>
                                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 5 }}>How to prepare</p>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {m.steps.map((step, j) => (
                                              <div key={j} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                                <span style={{
                                                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                                  background: 'linear-gradient(135deg, #C4788A 0%, #D4AF37 100%)',
                                                  color: '#fff', fontSize: 9, fontWeight: 700,
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>{j + 1}</span>
                                                <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>{step.replace(/^\d+\.\s*/, '')}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                        {dayPlan.snacks && dayPlan.snacks.length > 0 && (
                          <div style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 16 }}>🍎</span>
                              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Snacks</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                              {dayPlan.snacks.map((s, i) => (
                                <span key={i} style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- MAIN ----------
export function KidsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [kids, setKids] = useState<Kid[]>([]);
  const [milestones, setMilestones] = useState<Record<string, KidMilestone[]>>({});
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [kidTab, setKidTab] = useState<KidTab>('activityGen');
  const [showKidForm, setShowKidForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);

  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [notes, setNotes] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mCategory, setMCategory] = useState<KidMilestone['category']>('activity');
  const [mNotes, setMNotes] = useState('');

  function loadMilestonesForKid(kidId: string) {
    setMilestones((prev) => {
      if (prev[kidId]) return prev;
      return { ...prev, [kidId]: loadMilestonesLocal(kidId) };
    });
  }

  useEffect(() => {
    if (!user) return;
    const loaded = loadKids(user.id);
    setKids(loaded);
    if (loaded.length > 0) {
      setSelectedKid(loaded[0]);
      setMilestones((prev) => ({ ...prev, [loaded[0].id]: loadMilestonesLocal(loaded[0].id) }));
    }
  }, [user]);

  function openKidForm(kid?: Kid) {
    if (kid) {
      setEditingKid(kid); setName(kid.name); setBirthdate(kid.birthdate); setNotes(kid.notes || ''); setAvatar(kid.avatar || AVATARS[0]);
    } else {
      setEditingKid(null); setName(''); setBirthdate(''); setNotes(''); setAvatar(AVATARS[0]);
    }
    setShowKidForm(true);
  }

  function saveKid() {
    if (!user || !name.trim() || !birthdate) return;
    if (editingKid) {
      const updated = kids.map((k) => k.id === editingKid.id ? { ...k, name: name.trim(), birthdate, notes: notes.trim() || undefined, avatar } : k);
      setKids(updated);
      saveKids(user.id, updated);
      if (selectedKid?.id === editingKid.id) setSelectedKid({ ...editingKid, name: name.trim(), birthdate, notes: notes.trim() || undefined, avatar });
    } else {
      const newKid: Kid = { id: crypto.randomUUID(), user_id: user.id, name: name.trim(), birthdate, notes: notes.trim() || undefined, avatar, created_at: new Date().toISOString() };
      const updated = [...kids, newKid];
      setKids(updated);
      saveKids(user.id, updated);
      setSelectedKid(newKid);
      loadMilestonesForKid(newKid.id);
    }
    setShowKidForm(false);
  }

  function deleteKid(id: string) {
    if (!user) return;
    const updated = kids.filter((k) => k.id !== id);
    setKids(updated);
    saveKids(user.id, updated);
    if (selectedKid?.id === id) setSelectedKid(updated[0] ?? null);
  }

  function saveMilestone() {
    if (!selectedKid || !mTitle.trim()) return;
    const newM: KidMilestone = { id: crypto.randomUUID(), kid_id: selectedKid.id, title: mTitle.trim(), date: mDate, category: mCategory, notes: mNotes.trim() || undefined };
    const updated = [newM, ...(milestones[selectedKid.id] || [])];
    setMilestones((prev) => ({ ...prev, [selectedKid.id]: updated }));
    saveMilestonesLocal(selectedKid.id, updated);
    setMTitle(''); setMNotes('');
    setShowMilestoneForm(false);
  }

  function deleteMilestone(kidId: string, milestoneId: string) {
    const updated = (milestones[kidId] || []).filter((m) => m.id !== milestoneId);
    setMilestones((prev) => ({ ...prev, [kidId]: updated }));
    saveMilestonesLocal(kidId, updated);
  }

  const milestoneOptions = [
    { value: 'health', label: t('kids.health') },
    { value: 'school', label: t('kids.school') },
    { value: 'activity', label: t('kids.activity') },
    { value: 'firstTime', label: t('kids.firstTime') },
  ];

  const kidTabs: { key: KidTab; label: string }[] = [
    { key: 'activityGen', label: 'Activity Ideas' },
    { key: 'mealPlans', label: '🍽️ Meal Plans' },
    { key: 'schoolMeals', label: t('kids.schoolMealsTab') },
    { key: 'activities', label: t('kids.activitiesTab') },
    { key: 'milestones', label: t('kids.milestonesTab') },
    { key: 'lunchbox', label: 'Lunch Box' },
  ];

  return (
    <Layout background="url('/bg-kids.jpg') center/cover no-repeat">
      <div className="px-5 pt-5 pb-2">
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#3D2B1F', letterSpacing: '-0.01em', margin: 0 }}>{t('kids.title')}</h1>
      </div>

      {/* ── Pill-style child selector ── */}
      <div className="px-4 mt-3 flex items-center gap-2 flex-wrap">
        {kids.map((kid) => {
          const isSelected = selectedKid?.id === kid.id;
          return (
            <button
              key={kid.id}
              onClick={() => { setSelectedKid(kid); loadMilestonesForKid(kid.id); }}
              className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={isSelected ? {
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                color: '#fff',
              } : {
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-base leading-none">{kid.avatar || '👶'}</span>
              <span>{kid.name}</span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); deleteKid(kid.id); }}
                className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ml-0.5 transition-colors ${
                  isSelected ? 'bg-white/25 hover:bg-white/40' : 'bg-black/10 hover:bg-black/20 text-[var(--text-secondary)]'
                }`}
              >
                ×
              </span>
            </button>
          );
        })}
        <button
          onClick={() => openKidForm()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border-strong)' }}
        >
          + {t('kids.addKid')}
        </button>
      </div>

      {/* ── Always-visible tab bar ── */}
      <div className="flex rounded-2xl p-1 gap-1 mx-4 mt-3 mb-1 overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {kidTabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setKidTab(tb.key)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={(kidTab === tb.key && selectedKid) ? {
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: '#fff',
            } : { color: 'var(--text-secondary)' }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="px-4 mt-3 pb-8">
        {!selectedKid ? (
          <p className="text-center text-[var(--text-secondary)] text-sm py-8">
            {kids.length === 0 ? t('kids.noKids') : t('kids.selectKid')}
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedKid.id + kidTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {/* Kid header — name + edit */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedKid.avatar || '👶'}</span>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] leading-tight">{selectedKid.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t('kids.age', { years: differenceInYears(new Date(), parseISO(selectedKid.birthdate)) })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openKidForm(selectedKid)}>✏️</Button>
              </div>

              {selectedKid.notes && (
                <Card className="mb-3">
                  <p className="text-sm text-[var(--text-secondary)]">{selectedKid.notes}</p>
                </Card>
              )}

              {kidTab === 'milestones' && (
                <MilestonesTab
                  kid={selectedKid}
                  milestones={milestones[selectedKid.id] || []}
                  onAddMilestone={() => setShowMilestoneForm(true)}
                  onDeleteMilestone={(id) => deleteMilestone(selectedKid.id, id)}
                />
              )}
              {kidTab === 'mealPlans' && <AgeMealPlanTab kid={selectedKid} />}
              {kidTab === 'schoolMeals' && <SchoolMealsTab kid={selectedKid} />}
              {kidTab === 'activities' && <ActivitiesTab kid={selectedKid} />}
              {kidTab === 'activityGen' && <ActivitiesGenerator />}
              {kidTab === 'lunchbox' && <LunchBoxTab kid={selectedKid} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Kid form */}
      <Modal open={showKidForm} onClose={() => setShowKidForm(false)} title={editingKid ? t('kids.editKid') : t('kids.addKid')}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">{t('kids.avatar')}</label>
            <div className="flex gap-3 flex-wrap">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)}
                  className="w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-colors"
                style={avatar === a ? { background: 'var(--accent-soft)', border: '2px solid var(--accent)' } : { background: 'var(--bg-primary)' }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Input label={t('kids.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('kids.name')} />
          <Input label={t('kids.birthdate')} type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          <Textarea label={t('kids.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('kids.notes')} rows={3} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowKidForm(false)}>{t('kids.cancel')}</Button>
            <Button className="flex-1" onClick={saveKid}>{t('kids.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Milestone form */}
      <Modal open={showMilestoneForm} onClose={() => setShowMilestoneForm(false)} title={t('kids.addMilestone')}>
        <div className="flex flex-col gap-4">
          <Input label={t('kids.milestoneTitle')} value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder={t('kids.milestoneTitle')} />
          <Input label={t('kids.milestoneDate')} type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
          <Select label={t('kids.milestoneCategory')} value={mCategory} options={milestoneOptions} onChange={(e) => setMCategory(e.target.value as KidMilestone['category'])} />
          <Textarea label={t('kids.notes')} value={mNotes} onChange={(e) => setMNotes(e.target.value)} rows={3} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowMilestoneForm(false)}>{t('kids.cancel')}</Button>
            <Button className="flex-1" onClick={saveMilestone}>{t('kids.save')}</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
