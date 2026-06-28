import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { LuxuryScreenHeader } from '../components/ui/LuxuryScreenHeader';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/anthropic';
import { ProGate } from '../components/paywall/ProGate';
import i18n from '../i18n';

// Maps default step IDs → translation keys so labels are always in the active language
const STEP_LABEL_KEYS: Record<string, string> = {
  am1: 'selfcare.step_am1', am2: 'selfcare.step_am2', am3: 'selfcare.step_am3',
  am4: 'selfcare.step_am4', am5: 'selfcare.step_am5',
  pm1: 'selfcare.step_pm1', pm2: 'selfcare.step_pm2', pm3: 'selfcare.step_pm3',
  pm4: 'selfcare.step_pm4', pm5: 'selfcare.step_pm5',
  am_s1: 'selfcare.step_am_s1', am_s2: 'selfcare.step_am_s2', am_s3: 'selfcare.step_am_s3',
  am_s4: 'selfcare.step_am_s4', am_s5: 'selfcare.step_am_s5',
  pm_s1: 'selfcare.step_pm_s1', pm_s2: 'selfcare.step_pm_s2', pm_s3: 'selfcare.step_pm_s3',
  pm_s4: 'selfcare.step_pm_s4', pm_s5: 'selfcare.step_pm_s5', pm_s6: 'selfcare.step_pm_s6',
};
function tStep(id: string, fallback: string): string {
  const key = STEP_LABEL_KEYS[id];
  return key ? i18n.t(key) : fallback;
}
function tRoutineTitle(id: string, fallback: string): string {
  if (id === 'morning') return i18n.t('selfcare.morningRoutine');
  if (id === 'evening') return i18n.t('selfcare.eveningRoutine');
  return fallback;
}
const TREATMENT_STEPS: Record<string, string[]> = {
  bath: [
    'Fill the tub with warm water (37–39°C — not too hot)',
    'Add 2 cups Epsom salt + a few drops of lavender essential oil',
    'Optional: add a tablespoon of coconut oil for extra skin softness',
    'Soak for 15–20 min — let muscles fully relax',
    'Pat dry gently, then apply body lotion while skin is still slightly damp',
  ],
  claywrap: [
    'Mix kaolin or bentonite clay with warm water to a smooth paste',
    'Apply a generous, even layer over body — avoid face and neck',
    'Wrap loosely in cling film or a warm towel to lock in heat',
    'Leave on for 20–25 min while you rest',
    'Rinse off in the shower, then pat dry and moisturise well',
  ],
  scrub: [
    'Wet your skin in the shower with warm water',
    'Take a generous amount of coffee or sugar scrub in your hands',
    'Massage in circular motions starting from feet, moving upward',
    'Pay extra attention to knees, elbows, and heels',
    'Rinse thoroughly, then apply body oil or moisturiser immediately',
  ],
  roseoil: [
    'Warm a few drops of rose hip oil between your palms',
    'Start at shoulders — use long, sweeping strokes down the arms',
    'Work on the stomach in slow clockwise circles',
    'Massage legs from ankle to thigh with firm upward pressure',
    'Finish by gently pressing palms over your décolletage for 30s',
  ],
  facesteam: [
    'Boil water and pour into a bowl — add chamomile or rosemary if you have it',
    'Cleanse your face thoroughly before steaming',
    'Drape a towel over your head and lean over the bowl',
    'Keep face 20–30 cm from the water — steam for 8–10 min',
    'Pat dry, apply a toner, then follow with your serum and moisturiser',
  ],
  coldplunge: [
    'Start with a warm shower to open pores and relax muscles',
    'Gradually turn the temperature to cold over 30–60 seconds',
    'Focus on steady breathing — inhale deeply, exhale slowly',
    'Stay under cold water for 2–3 min (build up to 5 min over time)',
    'Finish, towel off quickly, and do light movement to rewarm',
  ],
  greenteamask: [
    'Mix 1 tbsp matcha or green tea powder with plain yoghurt or honey',
    'Cleanse skin, then apply mask evenly to face and neck',
    'Optionally apply a thin layer to arms or chest as an antioxidant boost',
    'Leave on for 15–20 min — relax and avoid talking',
    'Rinse with lukewarm water, follow with toner and moisturiser',
  ],
  meditation: [
    'Find a quiet spot — sit or lie down comfortably',
    'Close your eyes and take 5 deep breaths: 4 sec in, 4 sec out',
    'Body scan: mentally relax each body part from toes to crown',
    'Focus on your breath — when thoughts come, gently return to breathing',
    'End with 3 gratitude thoughts, then slowly open your eyes',
  ],
};

function getPresetTreatments() {
  return [
    { id: 'bath', emoji: '🛁', name: i18n.t('selfcare.treatBath'), duration: '20 min', benefit: i18n.t('selfcare.benefitBath') },
    { id: 'claywrap', emoji: '🌿', name: i18n.t('selfcare.treatClaywrap'), duration: '30 min', benefit: i18n.t('selfcare.benefitClaywrap') },
    { id: 'scrub', emoji: '🫧', name: i18n.t('selfcare.treatScrub'), duration: '15 min', benefit: i18n.t('selfcare.benefitScrub') },
    { id: 'roseoil', emoji: '🌹', name: i18n.t('selfcare.treatRoseoil'), duration: '20 min', benefit: i18n.t('selfcare.benefitRoseoil') },
    { id: 'facesteam', emoji: '🧖‍♀️', name: i18n.t('selfcare.treatFacesteam'), duration: '10 min', benefit: i18n.t('selfcare.benefitFacesteam') },
    { id: 'coldplunge', emoji: '🌊', name: i18n.t('selfcare.treatColdplunge'), duration: '5 min', benefit: i18n.t('selfcare.benefitColdplunge') },
    { id: 'greenteamask', emoji: '🍃', name: i18n.t('selfcare.treatGreenteamask'), duration: '25 min', benefit: i18n.t('selfcare.benefitGreenteamask') },
    { id: 'meditation', emoji: '💤', name: i18n.t('selfcare.treatMeditation'), duration: '15 min', benefit: i18n.t('selfcare.benefitMeditation') },
  ];
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SCTab = 'routines' | 'skincare' | 'wellness';

type RoutineStep = { id: string; label: string; time?: string; completed: boolean };
type Routine = { id: string; title: string; emoji: string; steps: RoutineStep[]; isDefault: boolean };
type RoutineData = { routines: Routine[]; completedDates: string[]; lastReset: string };

type SkincareStep = { id: string; label: string; product: string; completed: boolean };
type SkincareProduct = { id: string; name: string; step: string };
type SkincareDayLog = { date: string; amDone: number; amTotal: number; pmDone: number; pmTotal: number };
type SkincareData = { amSteps: SkincareStep[]; pmSteps: SkincareStep[]; products: SkincareProduct[]; logs: SkincareDayLog[]; lastReset: string };

type WellnessLog = { date: string; mood: number | null; sleepHours: number | null; water: number };
type JournalEntry = { id: string; date: string; text: string };
type WellnessData = { logs: WellnessLog[]; journal: JournalEntry[] };

type WorkoutType = 'strength' | 'cardio' | 'yoga' | 'hiit' | 'walking' | 'swimming';
type WorkoutEntry = { id: string; date: string; type: WorkoutType; duration: number; notes: string };
type WorkoutData = { entries: WorkoutEntry[] };

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MealEntry = { id: string; date: string; name: string; calories: number; mealType: MealType };
type CalorieData = {
  entries: MealEntry[];
  dailyGoal: number;
  currentWeight: number | null;
  goalWeight: number | null;
  timeframeMonths: number;
};

type AIMeal = {
  name: string;
  description: string;
  calories: number;
  grams: number;
  type: MealType;
  emoji: string;
  prepTime?: string;
  cookTime?: string;
  ingredients?: string[];
  steps?: string[];
};

type FoodLookupResult = {
  name: string;
  grams: number;
  calories: number;
  emoji: string;
};

type UserTreatment = { id: string; treatmentId: string; scheduledDay: string | null; completedDates: string[] };
type BodyTreatmentsData = { userTreatments: UserTreatment[] };

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd');

function getAffirmations(): string[] {
  const arr = i18n.t('selfcare.affirmations', { returnObjects: true });
  return Array.isArray(arr) ? (arr as string[]) : [
    'You are doing better than you think 🌸',
    'Small steps still move you forward 💪',
    'You deserve rest and joy ✨',
    'You are enough, exactly as you are 💕',
    'Progress, not perfection 🌻',
  ];
}

const DEFAULT_MORNING_STEPS: Omit<RoutineStep, 'completed'>[] = [
  { id: 'am1', label: 'Wake up & stretch', time: '5 min' },
  { id: 'am2', label: 'Drink water', time: '2 min' },
  { id: 'am3', label: 'Skincare', time: '5 min' },
  { id: 'am4', label: 'Breakfast', time: '15 min' },
  { id: 'am5', label: 'Plan your day', time: '5 min' },
];

const DEFAULT_EVENING_STEPS: Omit<RoutineStep, 'completed'>[] = [
  { id: 'pm1', label: 'Wind down', time: '10 min' },
  { id: 'pm2', label: 'Skincare routine', time: '5 min' },
  { id: 'pm3', label: 'Journal', time: '5 min' },
  { id: 'pm4', label: 'Prepare tomorrow', time: '5 min' },
  { id: 'pm5', label: 'Sleep time', time: '' },
];

const DEFAULT_AM_SKINCARE: Omit<SkincareStep, 'completed' | 'product'>[] = [
  { id: 'am_s1', label: 'Cleanser' },
  { id: 'am_s2', label: 'Toner' },
  { id: 'am_s3', label: 'Vitamin C Serum' },
  { id: 'am_s4', label: 'Moisturiser' },
  { id: 'am_s5', label: 'SPF' },
];

const DEFAULT_PM_SKINCARE: Omit<SkincareStep, 'completed' | 'product'>[] = [
  { id: 'pm_s1', label: 'Makeup Removal' },
  { id: 'pm_s2', label: 'Cleanser' },
  { id: 'pm_s3', label: 'Toner' },
  { id: 'pm_s4', label: 'Retinol / Serum' },
  { id: 'pm_s5', label: 'Night Cream' },
  { id: 'pm_s6', label: 'Eye Cream' },
];

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────

const R_KEY = (uid: string) => `mm_routines_${uid}`;
const SK_KEY = (uid: string) => `mm_skincare_${uid}`;
const WL_KEY = (uid: string) => `mm_wellness_${uid}`;
const WK_KEY = (uid: string) => `mm_workouts_${uid}`;
const CAL_KEY = (uid: string) => `mm_calories_${uid}`;
const BT_KEY = (uid: string) => `mm_body_treatments_${uid}`;

function loadRoutineData(uid: string): RoutineData {
  try {
    const raw = localStorage.getItem(R_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    routines: [
      { id: 'morning', title: 'Morning Routine', emoji: '🌅', steps: DEFAULT_MORNING_STEPS.map(s => ({ ...s, completed: false })), isDefault: true },
      { id: 'evening', title: 'Evening Routine', emoji: '🌙', steps: DEFAULT_EVENING_STEPS.map(s => ({ ...s, completed: false })), isDefault: true },
    ],
    completedDates: [],
    lastReset: TODAY,
  };
}
function saveRoutineData(uid: string, data: RoutineData) { localStorage.setItem(R_KEY(uid), JSON.stringify(data)); }

function loadSkincareData(uid: string): SkincareData {
  try {
    const raw = localStorage.getItem(SK_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    amSteps: DEFAULT_AM_SKINCARE.map(s => ({ ...s, product: '', completed: false })),
    pmSteps: DEFAULT_PM_SKINCARE.map(s => ({ ...s, product: '', completed: false })),
    products: [],
    logs: [],
    lastReset: TODAY,
  };
}
function saveSkincareData(uid: string, data: SkincareData) { localStorage.setItem(SK_KEY(uid), JSON.stringify(data)); }

function loadWellnessData(uid: string): WellnessData {
  try {
    const raw = localStorage.getItem(WL_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { logs: [], journal: [] };
}
function saveWellnessData(uid: string, data: WellnessData) { localStorage.setItem(WL_KEY(uid), JSON.stringify(data)); }

function loadWorkoutData(uid: string): WorkoutData {
  try { const raw = localStorage.getItem(WK_KEY(uid)); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return { entries: [] };
}
function saveWorkoutData(uid: string, data: WorkoutData) { localStorage.setItem(WK_KEY(uid), JSON.stringify(data)); }

function loadCalorieData(uid: string): CalorieData {
  try { const raw = localStorage.getItem(CAL_KEY(uid)); if (raw) return { entries: [], dailyGoal: 1500, currentWeight: null, goalWeight: null, timeframeMonths: 3, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return { entries: [], dailyGoal: 1500, currentWeight: null, goalWeight: null, timeframeMonths: 3 };
}
function saveCalorieData(uid: string, data: CalorieData) { localStorage.setItem(CAL_KEY(uid), JSON.stringify(data)); }

function loadBodyTreatments(uid: string): BodyTreatmentsData {
  try { const raw = localStorage.getItem(BT_KEY(uid)); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return { userTreatments: [] };
}
function saveBodyTreatments(uid: string, data: BodyTreatmentsData) { localStorage.setItem(BT_KEY(uid), JSON.stringify(data)); }

const WEEK_DAYS_BT = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function BodyTreatmentsSection({ uid }: { uid: string }) {
  const [data, setData] = useState<BodyTreatmentsData>(() => loadBodyTreatments(uid));
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function persist(updated: BodyTreatmentsData) { setData(updated); saveBodyTreatments(uid, updated); }

  function addTreatment(treatmentId: string) {
    if (data.userTreatments.some(t => t.treatmentId === treatmentId)) return;
    persist({ userTreatments: [...data.userTreatments, { id: crypto.randomUUID(), treatmentId, scheduledDay: null, completedDates: [] }] });
  }

  function removeTreatment(id: string) {
    persist({ userTreatments: data.userTreatments.filter(t => t.id !== id) });
  }

  function scheduleDay(id: string, day: string) {
    persist({ userTreatments: data.userTreatments.map(t => t.id === id ? { ...t, scheduledDay: t.scheduledDay === day ? null : day } : t) });
    setSchedulingId(null);
  }

  function toggleComplete(id: string) {
    const todayStr = TODAY;
    persist({
      userTreatments: data.userTreatments.map(t =>
        t.id === id
          ? { ...t, completedDates: t.completedDates.includes(todayStr) ? t.completedDates.filter(d => d !== todayStr) : [...t.completedDates, todayStr] }
          : t
      ),
    });
  }

  const presets = getPresetTreatments();
  const { t } = useTranslation();
  const myTreatments = data.userTreatments
    .map(ut => ({ ...ut, preset: presets.find(p => p.id === ut.treatmentId)! }))
    .filter(ut => ut.preset);

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>💆‍♀️ {t('selfcare.bodyTreatments')}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('selfcare.tapToAdd', 'Tap any card to add it to your personal list')}</p>
      </div>

      {/* Pre-built treatment cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {presets.map(pt => {
          const isAdded = data.userTreatments.some(t => t.treatmentId === pt.id);
          const isExpanded = expandedId === pt.id;
          const steps = TREATMENT_STEPS[pt.id] ?? [];
          return (
            <div key={pt.id} style={{
              background: isAdded ? 'var(--accent-soft)' : 'var(--bg-card)',
              borderRadius: 20,
              border: isAdded ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              {/* Card header row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : pt.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{pt.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{pt.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{pt.benefit}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '2px 8px',
                    background: isAdded ? 'var(--accent)' : 'var(--bg-primary)',
                    color: isAdded ? '#fff' : 'var(--text-secondary)',
                  }}>
                    {pt.duration}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expandable steps */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How to</p>
                      {steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--accent)', color: '#fff',
                            fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{i + 1}</span>
                          <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, paddingTop: 2 }}>{step}</p>
                        </div>
                      ))}
                      {/* Add button at bottom of expanded card */}
                      {!isAdded && (
                        <button
                          onClick={(e) => { e.stopPropagation(); addTreatment(pt.id); }}
                          style={{
                            marginTop: 6, padding: '9px 0', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                            color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}
                        >
                          + Add to My Treatments
                        </button>
                      )}
                      {isAdded && (
                        <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>✓ Already in your list</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* My Treatments list */}
      {myTreatments.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>My Treatments</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myTreatments.map(({ id, preset, scheduledDay, completedDates }) => {
              const doneToday = completedDates.includes(TODAY);
              return (
                <div key={id} style={{
                  background: doneToday ? 'var(--sage-soft, #EDF4EF)' : 'var(--bg-card)',
                  borderRadius: 20, border: `1.5px solid ${doneToday ? 'var(--sage)' : 'var(--border)'}`,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => toggleComplete(id)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        border: doneToday ? 'none' : '2px solid var(--border)',
                        background: doneToday ? 'var(--sage)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {doneToday && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </button>
                    <span style={{ fontSize: 22 }}>{preset.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textDecoration: doneToday ? 'line-through' : 'none' }}>{preset.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {preset.duration}
                        {scheduledDay && ` · Every ${scheduledDay}`}
                        {completedDates.length > 0 && ` · ${completedDates.length}× done`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setSchedulingId(schedulingId === id ? null : id)}
                        title="Schedule a day"
                        style={{ fontSize: 16, padding: 4, color: scheduledDay ? 'var(--accent)' : 'var(--text-secondary)', background: 'none', border: 'none' }}
                      >
                        📅
                      </button>
                      <button
                        onClick={() => removeTreatment(id)}
                        style={{ fontSize: 14, padding: 4, color: 'var(--text-secondary)', background: 'none', border: 'none' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {/* Day picker */}
                  <AnimatePresence>
                    {schedulingId === id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
                      >
                        <div style={{ paddingTop: 12, display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                          {WEEK_DAYS_BT.map(day => (
                            <button
                              key={day}
                              onClick={() => scheduleDay(id, day)}
                              style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: scheduledDay === day ? 'var(--accent)' : 'var(--bg-primary)',
                                color: scheduledDay === day ? '#fff' : 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Streak calculator
// ─────────────────────────────────────────────

function calcStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  let streak = 0;
  // If today done → start from today, else start from yesterday
  let d = set.has(TODAY) ? new Date() : subDays(new Date(), 1);
  for (let i = 0; i < 365; i++) {
    if (set.has(format(d, 'yyyy-MM-dd'))) { streak++; d = subDays(d, 1); }
    else break;
  }
  return streak;
}

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

function ProgressBar({ value, total, color = 'var(--accent)' }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.min((value / total) * 100, 100);
  return (
    <div style={{ height: 6, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: color, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      border: checked ? 'none' : '2px solid var(--border)',
      background: checked ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// ROUTINES TAB
// ─────────────────────────────────────────────

function RoutinesTab() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [data, setData] = useState<RoutineData | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newStepText, setNewStepText] = useState('');
  const [newSteps, setNewSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let d = loadRoutineData(user.id);
    // Daily reset
    if (d.lastReset !== TODAY) {
      // Check if any routine was fully completed yesterday → mark as completed date
      const anyDone = d.routines.some(r => r.steps.length > 0 && r.steps.every(s => s.completed));
      const dates = anyDone ? [...d.completedDates, d.lastReset] : d.completedDates;
      d = {
        ...d,
        routines: d.routines.map(r => ({ ...r, steps: r.steps.map(s => ({ ...s, completed: false })) })),
        completedDates: dates,
        lastReset: TODAY,
      };
      saveRoutineData(user.id, d);
    }
    setData(d);
  }, [user]);

  function toggleStep(routineId: string, stepId: string) {
    if (!user || !data) return;
    const updated: RoutineData = {
      ...data,
      routines: data.routines.map(r =>
        r.id === routineId
          ? { ...r, steps: r.steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s) }
          : r
      ),
    };
    // If just completed all steps in any routine → add today to completed dates
    const anyDone = updated.routines.some(r => r.steps.length > 0 && r.steps.every(s => s.completed));
    if (anyDone && !updated.completedDates.includes(TODAY)) {
      updated.completedDates = [...updated.completedDates, TODAY];
    }
    setData(updated);
    saveRoutineData(user.id, updated);
  }

  function addCustomRoutine() {
    if (!user || !data || !newRoutineName.trim() || newSteps.length === 0) return;
    const steps: RoutineStep[] = newSteps.map((label, i) => ({
      id: `custom_${Date.now()}_${i}`,
      label,
      completed: false,
    }));
    const routine: Routine = {
      id: `custom_${Date.now()}`,
      title: newRoutineName.trim(),
      emoji: '⭐',
      steps,
      isDefault: false,
    };
    const updated: RoutineData = { ...data, routines: [...data.routines, routine] };
    setData(updated);
    saveRoutineData(user.id, updated);
    setShowAddSheet(false);
    setNewRoutineName('');
    setNewSteps([]);
  }

  function deleteRoutine(routineId: string) {
    if (!user || !data) return;
    const updated: RoutineData = { ...data, routines: data.routines.filter(r => r.id !== routineId) };
    setData(updated);
    saveRoutineData(user.id, updated);
  }

  if (!data) return null;
  const streak = calcStreak(data.completedDates);

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-24">
      {/* Streak */}
      {streak > 0 && (
        <div style={{
          borderRadius: 20, padding: '12px 16px',
          background: 'var(--accent-gold-soft)',
          border: '1px solid rgba(201,169,110,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{streak} {t('selfcare.dayStreak', 'day streak!')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('selfcare.keepCompletingRoutines', 'Keep completing your routines')}</p>
          </div>
        </div>
      )}

      {/* Routine cards */}
      {data.routines.map(routine => {
        const done = routine.steps.filter(s => s.completed).length;
        const total = routine.steps.length;
        return (
          <motion.div key={routine.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{routine.emoji}</span>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{tRoutineTitle(routine.id, routine.title)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{done}/{total}</span>
                  {!routine.isDefault && (
                    <button onClick={() => deleteRoutine(routine.id)} style={{ padding: 4, color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <ProgressBar value={done} total={total} color="linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%)" />
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {routine.steps.map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Checkbox checked={step.completed} onChange={() => toggleStep(routine.id, step.id)} />
                  <span style={{
                    flex: 1, fontSize: 14,
                    color: step.completed ? 'var(--sage)' : 'var(--text-primary)',
                    textDecoration: step.completed ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>{tStep(step.id, step.label)}</span>
                  {step.time && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 8, padding: '2px 8px' }}>
                      {step.time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Add routine button */}
      <button onClick={() => setShowAddSheet(true)} style={{

        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 52, borderRadius: 20,
        border: '2px dashed var(--border)',
        background: 'transparent',
        color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {t('selfcare.addCustomRoutine', 'Add Custom Routine')}
      </button>

      {/* Add routine bottom sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddSheet(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                padding: '20px 16px 40px',
              }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 16 }}>{t('selfcare.newRoutine', 'New Routine')}</p>

              <input
                value={newRoutineName}
                onChange={e => setNewRoutineName(e.target.value)}
                placeholder="Routine name (e.g. Lunchtime reset)"
                style={{
                  width: '100%', borderRadius: 14, padding: '12px 14px', fontSize: 14,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                  outline: 'none', marginBottom: 12,
                }}
              />

              {newSteps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {newSteps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--accent)', width: 18, textAlign: 'center' }}>•</span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s}</span>
                      <button onClick={() => setNewSteps(prev => prev.filter((_, j) => j !== i))}
                        style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newStepText}
                  onChange={e => setNewStepText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newStepText.trim()) { setNewSteps(p => [...p, newStepText.trim()]); setNewStepText(''); } }}
                  placeholder="Add a step..."
                  style={{
                    flex: 1, borderRadius: 14, padding: '10px 14px', fontSize: 14,
                    background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <button onClick={() => { if (newStepText.trim()) { setNewSteps(p => [...p, newStepText.trim()]); setNewStepText(''); } }}
                  style={{
                    width: 44, height: 44, borderRadius: 14, border: 'none', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
              </div>

              <button onClick={addCustomRoutine}
                disabled={!newRoutineName.trim() || newSteps.length === 0}
                style={{
                  width: '100%', height: 50, borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: '#fff', fontWeight: 600, fontSize: 15,
                  opacity: (!newRoutineName.trim() || newSteps.length === 0) ? 0.5 : 1,
                }}>
                Save Routine
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Body Treatments Section ── */}
      <div style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        {user && <BodyTreatmentsSection uid={user.id} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SKINCARE TAB
// ─────────────────────────────────────────────

function SkincareTab() {
  const { user } = useAuth();
  const [data, setData] = useState<SkincareData | null>(null);
  const [skinType, setSkinType] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductStep, setNewProductStep] = useState('');

  useEffect(() => {
    if (!user) return;
    let d = loadSkincareData(user.id);
    if (d.lastReset !== TODAY) {
      // Log yesterday
      const amDone = d.amSteps.filter(s => s.completed).length;
      const pmDone = d.pmSteps.filter(s => s.completed).length;
      if (amDone > 0 || pmDone > 0) {
        d = { ...d, logs: [...d.logs, { date: d.lastReset, amDone, amTotal: d.amSteps.length, pmDone, pmTotal: d.pmSteps.length }] };
      }
      d = {
        ...d,
        amSteps: d.amSteps.map(s => ({ ...s, completed: false })),
        pmSteps: d.pmSteps.map(s => ({ ...s, completed: false })),
        lastReset: TODAY,
      };
      saveSkincareData(user.id, d);
    }
    setData(d);
  }, [user]);

  function toggleStep(isAM: boolean, stepId: string) {
    if (!user || !data) return;
    const field = isAM ? 'amSteps' : 'pmSteps';
    const updated: SkincareData = {
      ...data,
      [field]: data[field].map((s: SkincareStep) => s.id === stepId ? { ...s, completed: !s.completed } : s),
    };
    setData(updated);
    saveSkincareData(user.id, updated);
  }

  function updateProduct(isAM: boolean, stepId: string, product: string) {
    if (!user || !data) return;
    const field = isAM ? 'amSteps' : 'pmSteps';
    const updated: SkincareData = {
      ...data,
      [field]: data[field].map((s: SkincareStep) => s.id === stepId ? { ...s, product } : s),
    };
    setData(updated);
    saveSkincareData(user.id, updated);
  }

  function addProduct() {
    if (!user || !data || !newProductName.trim()) return;
    const product: SkincareProduct = { id: `p_${Date.now()}`, name: newProductName.trim(), step: newProductStep.trim() };
    const updated: SkincareData = { ...data, products: [...data.products, product] };
    setData(updated);
    saveSkincareData(user.id, updated);
    setNewProductName('');
    setNewProductStep('');
    setShowProductForm(false);
  }

  function removeProduct(id: string) {
    if (!user || !data) return;
    const updated: SkincareData = { ...data, products: data.products.filter(p => p.id !== id) };
    setData(updated);
    saveSkincareData(user.id, updated);
  }

  async function getAdvice() {
    if (!skinType) return;
    setAdviceLoading(true);
    try {
      const result = await askAI(
        `Give personalised skincare advice for someone with ${skinType} skin.
Main concerns: ${concerns.length > 0 ? concerns.join(', ') : 'general care'}.
Suggest a simple morning and evening routine with product recommendations.
Keep it practical and affordable. Write in plain text with no markdown, no asterisks, no dollar signs, no special formatting. Just clean readable sentences. 150 words max.`,
        400
      );
      setAdvice(result.replace(/\*\*/g, '').replace(/\*/g, '').replace(/~?\$\d+[\d.]*/g, '').replace(/\s{2,}/g, ' ').trim());
    } catch { /* ignore */ } finally {
      setAdviceLoading(false);
    }
  }

  if (!data) return null;

  // Weekly calendar dots (last 7 days incl today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, 'yyyy-MM-dd');
    const log = data.logs.find(l => l.date === key);
    // Today: check live state
    if (key === TODAY) {
      const amDone = data.amSteps.filter(s => s.completed).length;
      const pmDone = data.pmSteps.filter(s => s.completed).length;
      const total = data.amSteps.length + data.pmSteps.length;
      if (total === 0) return { label: format(d, 'EEE')[0], status: 'grey' as const };
      if (amDone === data.amSteps.length && pmDone === data.pmSteps.length) return { label: format(d, 'EEE')[0], status: 'green' as const };
      if (amDone > 0 || pmDone > 0) return { label: format(d, 'EEE')[0], status: 'yellow' as const };
      return { label: format(d, 'EEE')[0], status: 'grey' as const };
    }
    if (!log) return { label: format(d, 'EEE')[0], status: 'grey' as const };
    if (log.amDone === log.amTotal && log.pmDone === log.pmTotal) return { label: format(d, 'EEE')[0], status: 'green' as const };
    if (log.amDone > 0 || log.pmDone > 0) return { label: format(d, 'EEE')[0], status: 'yellow' as const };
    return { label: format(d, 'EEE')[0], status: 'grey' as const };
  });

  const dotColor = { green: '#8FA888', yellow: '#E8B89A', grey: 'var(--border)' };

  const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
  const CONCERNS = ['Acne', 'Anti-aging', 'Hydration', 'Brightening', 'Sensitivity'];

  const amDone = data.amSteps.filter(s => s.completed).length;
  const pmDone = data.pmSteps.filter(s => s.completed).length;

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-24">
      {/* Weekly calendar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '14px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>This week</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: dotColor[d.status], border: '2px solid var(--bg-card)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
          {[['green', '🟢 Full routine'], ['yellow', '🟡 Partial'], ['grey', '⚪ Missed']].map(([c, label]) => (
            <span key={c} style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
          ))}
        </div>
      </div>

      {/* AM Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>☀️</span>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Morning (AM)</p>
          </div>
          <span style={{ fontSize: 12, color: amDone === data.amSteps.length ? '#8FA888' : 'var(--text-secondary)' }}>
            {amDone}/{data.amSteps.length} done
          </span>
        </div>
        <div style={{ padding: '0 16px 4px' }}>
          <ProgressBar value={amDone} total={data.amSteps.length} color="#8FA888" />
        </div>
        <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.amSteps.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Checkbox checked={step.completed} onChange={() => toggleStep(true, step.id)} />
              <span style={{
                fontSize: 13, fontWeight: 500, minWidth: 90,
                color: step.completed ? 'var(--sage)' : 'var(--text-primary)',
                textDecoration: step.completed ? 'line-through' : 'none',
              }}>{tStep(step.id, step.label)}</span>
              <input
                value={step.product}
                onChange={e => updateProduct(true, step.id, e.target.value)}
                placeholder="e.g. CeraVe"
                style={{
                  flex: 1, borderRadius: 10, padding: '5px 10px', fontSize: 12,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* PM Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🌙</span>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Evening (PM)</p>
          </div>
          <span style={{ fontSize: 12, color: pmDone === data.pmSteps.length ? '#8FA888' : 'var(--text-secondary)' }}>
            {pmDone}/{data.pmSteps.length} done
          </span>
        </div>
        <div style={{ padding: '0 16px 4px' }}>
          <ProgressBar value={pmDone} total={data.pmSteps.length} color="var(--lavender)" />
        </div>
        <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.pmSteps.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Checkbox checked={step.completed} onChange={() => toggleStep(false, step.id)} />
              <span style={{
                fontSize: 13, fontWeight: 500, minWidth: 90,
                color: step.completed ? 'var(--lavender)' : 'var(--text-primary)',
                textDecoration: step.completed ? 'line-through' : 'none',
              }}>{tStep(step.id, step.label)}</span>
              <input
                value={step.product}
                onChange={e => updateProduct(false, step.id, e.target.value)}
                placeholder="e.g. La Roche-Posay"
                style={{
                  flex: 1, borderRadius: 10, padding: '5px 10px', fontSize: 12,
                  background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI Skincare Advisor */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Get personalised skincare advice ✨</p>
        </div>

        {/* Skin type */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Skin type</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {SKIN_TYPES.map(t => (
            <button key={t} onClick={() => setSkinType(t === skinType ? '' : t)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none',
                background: skinType === t ? 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)' : 'var(--bg-primary)',
                color: skinType === t ? '#fff' : 'var(--text-secondary)',
              }}>{t}</button>
          ))}
        </div>

        {/* Concerns */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Concerns</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {CONCERNS.map(c => (
            <button key={c} onClick={() => setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none',
                background: concerns.includes(c) ? 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)' : 'var(--bg-primary)',
                color: concerns.includes(c) ? '#fff' : 'var(--text-secondary)',
              }}>{c}</button>
          ))}
        </div>

        <button onClick={getAdvice} disabled={adviceLoading || !skinType}
          style={{
            width: '100%', height: 46, borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)',
            color: '#fff', fontWeight: 600, fontSize: 14, opacity: adviceLoading || !skinType ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {adviceLoading ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Getting advice...</>
          ) : 'Get Advice'}
        </button>

        {advice && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'var(--lavender-soft)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {advice.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+ /g, '').replace(/~?\$[\d.]+/g, '').replace(/,\s*\)/g, ')').replace(/\(\s*\)/g, '').replace(/,\s*—/g, ' —').replace(/  +/g, ' ').trim()}
            </p>
          </div>
        )}
      </div>

      {/* My Products */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>My Products</p>
          <button onClick={() => setShowProductForm(f => !f)}
            style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>+</button>
        </div>

        {showProductForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Product name"
              style={{ borderRadius: 12, padding: '9px 12px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
            <input value={newProductStep} onChange={e => setNewProductStep(e.target.value)} placeholder="Step (e.g. Moisturiser)"
              style={{ borderRadius: 12, padding: '9px 12px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
            <button onClick={addProduct}
              style={{ height: 40, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)', color: '#fff', fontWeight: 600, fontSize: 13 }}>
              Add Product
            </button>
          </div>
        )}

        {data.products.length === 0 && !showProductForm && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
            Tap + to add your products
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.products.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--lavender-soft)', borderRadius: 20, padding: '5px 10px 5px 12px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.name}</span>
              {p.step && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>· {p.step}</span>}
              <button onClick={() => removeProduct(p.id)} style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// WORKOUT TRACKER
// ─────────────────────────────────────────────

const WORKOUT_TYPES: { type: WorkoutType; emoji: string; label: string }[] = [
  { type: 'strength', emoji: '💪', label: 'Strength' },
  { type: 'cardio',   emoji: '🏃', label: 'Cardio' },
  { type: 'yoga',     emoji: '🧘', label: 'Yoga' },
  { type: 'hiit',     emoji: '🔥', label: 'HIIT' },
  { type: 'walking',  emoji: '🚶', label: 'Walking' },
  { type: 'swimming', emoji: '🏊', label: 'Swimming' },
];

type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

const WORKOUT_GUIDES: Record<WorkoutType, Record<WorkoutLevel, { title: string; location: string; duration: string; items: string[] }>> = {
  strength: {
    beginner: {
      title: '💪 Full Body — Beginner',
      location: '🏠 Home',
      duration: '25 min',
      items: [
        'Warm-up: 5 min light marching in place',
        '3×12 bodyweight squats',
        '3×10 push-ups (knees ok)',
        '3×12 reverse lunges each leg',
        '3×15 glute bridges',
        '3×10 superman holds (back extension)',
        'Cool-down: stretch quads, chest & back 5 min',
      ],
    },
    intermediate: {
      title: '💪 Upper + Lower Split',
      location: '🏠 Home / 🏋️ Gym',
      duration: '40 min',
      items: [
        'Warm-up: 5 min jumping jacks + arm circles',
        '4×12 dumbbell goblet squats',
        '4×10 dumbbell Romanian deadlifts',
        '3×12 dumbbell chest press (floor or bench)',
        '3×12 bent-over dumbbell rows each side',
        '3×15 lateral raises',
        '3×20 bicycle crunches',
        'Cool-down: hip flexor + shoulder stretch 5 min',
      ],
    },
    advanced: {
      title: '💪 Strength & Power Circuit',
      location: '🏋️ Gym',
      duration: '55 min',
      items: [
        'Warm-up: 8 min treadmill + dynamic stretches',
        '4×8 barbell back squats (moderate weight)',
        '4×8 barbell Romanian deadlifts',
        '4×10 incline dumbbell press',
        '4×10 cable seated rows',
        '3×12 Bulgarian split squats each leg',
        '3×15 cable lateral raises',
        '3×12 tricep cable pushdowns',
        '3×10 EZ-bar bicep curls',
        'Cool-down: foam roll quads, hamstrings, lats',
      ],
    },
  },
  cardio: {
    beginner: {
      title: '🏃 Gentle Cardio Walk',
      location: '🏠 Home / Outdoors',
      duration: '30 min',
      items: [
        '5 min easy walk warm-up',
        '20 min brisk walk (breathe but can talk)',
        '5 min slow walk cool-down',
        'Stretch calves, quads & hip flexors 5 min',
        'Aim for 4×/week to build base fitness',
      ],
    },
    intermediate: {
      title: '🏃 Run-Walk Intervals',
      location: '🏠 Outdoors / Treadmill',
      duration: '35 min',
      items: [
        '5 min brisk walk warm-up',
        'Repeat 6×: 3 min jog + 1 min walk',
        '5 min cool-down walk',
        'Stretch hip flexors, calves & hamstrings',
        'Progress by adding 1 jog interval each week',
      ],
    },
    advanced: {
      title: '🏃 Tempo + Sprint Session',
      location: '🏋️ Treadmill / Track',
      duration: '45 min',
      items: [
        '10 min easy jog warm-up',
        '15 min tempo run (comfortably hard pace)',
        '5× 30s all-out sprints with 90s easy jog recovery',
        '10 min easy jog cool-down',
        'Stretch: piriformis, calves & hip flexors 5 min',
      ],
    },
  },
  yoga: {
    beginner: {
      title: '🧘 Morning Flow — Gentle',
      location: '🏠 Home',
      duration: '20 min',
      items: [
        'Mountain pose — 30s, breathe deep',
        'Cat-Cow — 10 slow reps, loosen spine',
        'Downward Dog — hold 30s, walk out heels',
        'Low Lunge each side — 30s, open hip flexors',
        "Child's pose — 1 min, rest & breathe",
        'Seated forward fold — 45s, hamstrings',
        'Supine twist each side — 30s, release back',
        'Savasana — 3 min, full body relax',
      ],
    },
    intermediate: {
      title: '🧘 Vinyasa Flow',
      location: '🏠 Home / Studio',
      duration: '35 min',
      items: [
        '5 min breathing & seated warm-up',
        '5× Sun Salutation A (flow breath to movement)',
        'Warrior I + II + Reverse Warrior — 45s each side',
        'Triangle pose each side — 45s',
        'Chair pose — 1 min hold',
        'Plank → Chaturanga → Upward Dog — 5 reps',
        'Pigeon pose each side — 1 min deep stretch',
        'Seated spinal twist + forward fold',
        'Savasana — 5 min',
      ],
    },
    advanced: {
      title: '🧘 Power Yoga + Balance',
      location: '🏠 Home / Studio',
      duration: '50 min',
      items: [
        '10 min Surya Namaskar B series (8 rounds)',
        'Crow pose (Bakasana) — hold attempts 3×',
        'Handstand prep against wall — 3× 30s',
        'Half moon pose each side — 1 min',
        'Warrior III each side — 1 min balance hold',
        'Wheel pose (Urdhva Dhanurasana) — 3× 20s',
        'Forearm balance (Pincha) prep — 3× 30s',
        'Yin finish: pigeon + dragon pose 2 min each',
        'Yoga nidra / Savasana — 8 min',
      ],
    },
  },
  hiit: {
    beginner: {
      title: '🔥 Low Impact HIIT',
      location: '🏠 Home',
      duration: '20 min',
      items: [
        'Warm-up: 3 min arm swings + hip circles',
        '3 rounds (40s work / 20s rest):',
        '  • Step jacks (low impact jumping jacks)',
        '  • Squat pulses',
        '  • March in place with high knees',
        '  • Modified push-ups',
        '  • Standing oblique crunches',
        'Cool-down: 5 min full body stretch',
      ],
    },
    intermediate: {
      title: '🔥 HIIT Circuit',
      location: '🏠 Home',
      duration: '30 min',
      items: [
        'Warm-up: 5 min dynamic stretches',
        '4 rounds (40s work / 15s rest):',
        '  • Burpees',
        '  • Jump squats',
        '  • Push-up to shoulder tap',
        '  • Speed skaters',
        '  • Plank hip dips',
        '  • Jump lunges',
        'Rest 90s between rounds',
        'Cool-down: 5 min stretch',
      ],
    },
    advanced: {
      title: '🔥 Advanced HIIT + Core',
      location: '🏠 Home / 🏋️ Gym',
      duration: '40 min',
      items: [
        'Warm-up: 5 min jog + mobilisation',
        '5 rounds (45s work / 10s rest):',
        '  • Tuck jumps',
        '  • Plyometric push-ups',
        '  • Single-leg burpees (alt. legs)',
        '  • Box jumps or jump squat variation',
        '  • Dragon flag core holds',
        '  • Lateral bound + stick',
        'Rest 60s between rounds',
        'Finisher: 3 min plank challenge',
        'Cool-down: deep stretch 8 min',
      ],
    },
  },
  walking: {
    beginner: {
      title: '🚶 Daily Steps Target',
      location: '🏠 Outdoors / Mall',
      duration: '30 min',
      items: [
        'Aim for 7,000–8,000 steps/day',
        '30 min easy walk, comfortable pace',
        'Wear supportive shoes',
        '🎧 Great for podcasts or music',
        'Bonus: take stairs instead of lifts',
        'Track with phone health app or watch',
      ],
    },
    intermediate: {
      title: '🚶 Power Walk + Hills',
      location: '🏠 Outdoors',
      duration: '45 min',
      items: [
        'Aim for 10,000 steps/day',
        '10 min easy warm-up walk',
        '25 min brisk power walk (push pace)',
        'Include hills or incline if available',
        '10 min cool-down easy walk',
        'Arm swing actively for extra calorie burn',
        'Stretch hips & calves after',
      ],
    },
    advanced: {
      title: '🚶 Weighted Rucking',
      location: '🏠 Outdoors / Trails',
      duration: '60 min',
      items: [
        'Load a backpack with 5–10 kg',
        '10 min easy warm-up walk',
        '40 min brisk walk with weight on back',
        'Include hills — max calorie & strength benefit',
        '10 min cool-down walk',
        'Stretch hip flexors, glutes & upper back',
        'Aim for 12,000–15,000 steps on ruck days',
      ],
    },
  },
  swimming: {
    beginner: {
      title: '🏊 Easy Pool Session',
      location: '🏋️ Pool',
      duration: '30 min',
      items: [
        '4 lengths easy warm-up (any stroke)',
        '8 lengths main set — rest 30s every 2 lengths',
        'Focus on breathing technique',
        '2 lengths cool-down (backstroke)',
        'Total ~30 min · great for joints',
      ],
    },
    intermediate: {
      title: '🏊 Endurance Swim',
      location: '🏋️ Pool',
      duration: '45 min',
      items: [
        '200m warm-up: easy freestyle',
        '400m main set: freestyle with flip turns',
        '4× 50m kick sets with kickboard, rest 20s each',
        '4× 50m pull sets with pull buoy, rest 20s each',
        '200m cool-down: backstroke',
        'Total ~1600m · stretch shoulders & hips after',
      ],
    },
    advanced: {
      title: '🏊 Swim Intervals',
      location: '🏋️ Pool',
      duration: '60 min',
      items: [
        '400m warm-up: mixed strokes',
        '8× 100m on 2:00 (aim negative splits)',
        '4× 50m butterfly or breaststroke, rest 30s',
        '8× 25m sprint on 1:00',
        '200m cool-down: easy backstroke',
        'Total ~2400m · foam roll shoulders & lats',
      ],
    },
  },
};

const LEVELS: { id: WorkoutLevel; label: string; color: string }[] = [
  { id: 'beginner',     label: 'Beginner',     color: '#8FA888' },
  { id: 'intermediate', label: 'Intermediate', color: '#C9A96E' },
  { id: 'advanced',     label: 'Advanced',     color: '#C4788A' },
];

function WorkoutTracker({ uid }: { uid: string }) {
  const [data, setData] = useState<WorkoutData>(() => uid ? loadWorkoutData(uid) : { entries: [] });
  const [logging, setLogging] = useState<WorkoutType | null>(null);
  const [level, setLevel] = useState<WorkoutLevel>('beginner');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { if (uid) setData(loadWorkoutData(uid)); }, [uid]);

  function logWorkout() {
    const mins = parseInt(duration);
    if (!logging || !mins || mins <= 0) return;
    const entry: WorkoutEntry = { id: `w_${Date.now()}`, date: TODAY, type: logging, duration: mins, notes: notes.trim() };
    const updated = { entries: [entry, ...data.entries] };
    setData(updated);
    if (uid) saveWorkoutData(uid, updated);
    setLogging(null); setDuration(''); setNotes('');
  }

  const todayEntries = data.entries.filter(e => e.date === TODAY);

  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const weekEntries = data.entries.filter(e => e.date >= weekStart);
  const weekMins = weekEntries.reduce((s, e) => s + e.duration, 0);

  const activeLevel = LEVELS.find(l => l.id === level)!;
  const guide = logging ? WORKOUT_GUIDES[logging][level] : null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 14, background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💪</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Workout Tracker</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {weekEntries.length} workout{weekEntries.length !== 1 ? 's' : ''} this week · {weekMins} min total
          </p>
        </div>
      </div>

      {/* Level selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => setLevel(l.id)}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 12, border: `2px solid ${level === l.id ? l.color : 'transparent'}`,
              background: level === l.id ? `${l.color}22` : 'var(--bg-primary)',
              fontSize: 11, fontWeight: 700, color: level === l.id ? l.color : 'var(--text-muted)', cursor: 'pointer',
            }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Quick-log buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {WORKOUT_TYPES.map(w => (
          <button key={w.type} onClick={() => setLogging(logging === w.type ? null : w.type)}
            style={{
              padding: '10px 6px', borderRadius: 16, border: '2px solid',
              borderColor: logging === w.type ? activeLevel.color : 'transparent',
              background: logging === w.type ? `${activeLevel.color}22` : 'var(--bg-primary)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 22 }}>{w.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: logging === w.type ? activeLevel.color : 'var(--text-secondary)' }}>{w.label}</span>
          </button>
        ))}
      </div>

      {/* Guide + Log panel */}
      <AnimatePresence>
        {logging && guide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ background: `${activeLevel.color}18`, borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${activeLevel.color}33` }}>
              {/* Title + meta */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: activeLevel.color, marginBottom: 4 }}>{guide.title}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 8, padding: '2px 8px' }}>{guide.location}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 8, padding: '2px 8px' }}>⏱ {guide.duration}</span>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {guide.items.map((item, i) => {
                  const isBullet = item.startsWith('  •');
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: isBullet ? 12 : 0 }}>
                      {!isBullet && (
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${activeLevel.color} 0%, ${activeLevel.color}99 100%)`,
                          color: '#fff', fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, paddingTop: isBullet ? 0 : 2 }}>
                        {isBullet ? item.replace('  •', '•') : item}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

              {/* Log form */}
              <p style={{ fontSize: 11, fontWeight: 600, color: activeLevel.color }}>Log this workout</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={duration} onChange={e => setDuration(e.target.value)}
                  type="number" inputMode="numeric" placeholder="Duration (min)"
                  style={{ flex: 1, borderRadius: 12, padding: '9px 12px', fontSize: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                <button onClick={logWorkout} disabled={!duration || parseInt(duration) <= 0}
                  style={{ padding: '9px 16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${activeLevel.color} 0%, ${activeLevel.color}cc 100%)`, color: '#fff', fontWeight: 600, fontSize: 13, opacity: duration && parseInt(duration) > 0 ? 1 : 0.5 }}>
                  Log ✓
                </button>
              </div>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes (optional)" maxLength={80}
                style={{ borderRadius: 12, padding: '8px 12px', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's log */}
      {todayEntries.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Today</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayEntries.map(e => {
              const wt = WORKOUT_TYPES.find(w => w.type === e.type)!;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-primary)', borderRadius: 14, padding: '9px 12px' }}>
                  <span style={{ fontSize: 18 }}>{wt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{wt.label} · {e.duration} min</p>
                    {e.notes && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.notes}</p>}
                  </div>
                  <button onClick={() => {
                    const updated = { entries: data.entries.filter(x => x.id !== e.id) };
                    setData(updated); if (uid) saveWorkoutData(uid, updated);
                  }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CALORIE & MEAL TRACKER
// ─────────────────────────────────────────────

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { type: 'lunch',     emoji: '🥗', label: 'Lunch' },
  { type: 'dinner',    emoji: '🍽️', label: 'Dinner' },
  { type: 'snack',     emoji: '🍎', label: 'Snack' },
];

const TIMEFRAME_OPTIONS = [
  { months: 1, label: '1 month' },
  { months: 2, label: '2 months' },
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
];

function calcDailyCalories(currentKg: number, goalKg: number, months: number): number {
  const kgDiff = currentKg - goalKg; // positive = lose weight
  const weeks = months * 4.33;
  const kgPerWeek = kgDiff / weeks;
  // 0.5 kg/week ≈ 500 kcal deficit
  const deficit = kgPerWeek * 1000;
  // Estimated TDEE for moderately active woman ≈ 2000 kcal
  const base = 2000;
  return Math.max(1200, Math.round(base - deficit));
}

function CalorieTracker({ uid }: { uid: string }) {
  const [data, setData] = useState<CalorieData>(() => uid ? loadCalorieData(uid) : { entries: [], dailyGoal: 1500, currentWeight: null, goalWeight: null, timeframeMonths: 3 });
  const [showForm, setShowForm] = useState(false);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  // Food lookup
  const [foodQuery, setFoodQuery] = useState('');
  const [foodLookupLoading, setFoodLookupLoading] = useState(false);
  const [foodResult, setFoodResult] = useState<FoodLookupResult | null>(null);
  const [foodError, setFoodError] = useState('');

  // Weight goal setup
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [cwInput, setCwInput] = useState('');
  const [gwInput, setGwInput] = useState('');
  const [tfInput, setTfInput] = useState(3);
  const [calcResult, setCalcResult] = useState<string | null>(null);

  // AI
  const [aiMeals, setAiMeals] = useState<AIMeal[] | null>(null);
  const [aiTotal, setAiTotal] = useState<number>(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [expandedMealIdx, setExpandedMealIdx] = useState<number | null>(null);

  useEffect(() => { if (uid) setData(loadCalorieData(uid)); }, [uid]);

  function persist(updated: CalorieData) {
    setData(updated); if (uid) saveCalorieData(uid, updated);
  }

  const todayMeals = data.entries.filter(e => e.date === TODAY);
  const consumed = todayMeals.reduce((s, e) => s + e.calories, 0);
  const remaining = data.dailyGoal - consumed;
  const pct = Math.min((consumed / data.dailyGoal) * 100, 100);
  const barColor = pct >= 100 ? '#ef4444' : pct >= 85 ? '#f97316' : '#8FA888';

  async function lookupFood() {
    if (!foodQuery.trim()) return;
    setFoodLookupLoading(true); setFoodResult(null); setFoodError('');
    try {
      const prompt = `You are a nutritionist. For the food "${foodQuery.trim()}", return ONLY valid JSON with no markdown:
{"name":"Chicken breast grilled","grams":150,"calories":248,"emoji":"🍗"}
One standard portion. Grams = typical serving size. Calories for that portion.`;
      const raw = await askAI(prompt);
      const jsonStr = raw.replace(/```json|```/g, '').trim();
      const s = jsonStr.indexOf('{'); const e = jsonStr.lastIndexOf('}');
      const parsed = JSON.parse(jsonStr.slice(s, e + 1));
      setFoodResult(parsed as FoodLookupResult);
    } catch {
      setFoodError('Nu am putut găsi informații. Încearcă din nou.');
    }
    setFoodLookupLoading(false);
  }

  function addFoodToLog() {
    if (!foodResult) return;
    const entry: MealEntry = { id: `m_${Date.now()}`, date: TODAY, name: `${foodResult.name} (${foodResult.grams}g)`, calories: foodResult.calories, mealType };
    persist({ ...data, entries: [entry, ...data.entries] });
    setFoodQuery(''); setFoodResult(null); setShowForm(false);
  }

  function deleteMeal(id: string) {
    persist({ ...data, entries: data.entries.filter(e => e.id !== id) });
  }

  function calculateGoal() {
    const cw = parseFloat(cwInput);
    const gw = parseFloat(gwInput);
    if (!cw || !gw || cw <= 0 || gw <= 0) return;
    const calories = calcDailyCalories(cw, gw, tfInput);
    const diff = Math.abs(cw - gw);
    const action = gw < cw ? 'lose' : 'gain';
    setCalcResult(`Your daily calorie goal: ${calories} kcal (to ${action} ${diff.toFixed(1)} kg in ${tfInput} month${tfInput > 1 ? 's' : ''})`);
    persist({ ...data, currentWeight: cw, goalWeight: gw, timeframeMonths: tfInput, dailyGoal: calories });
    setTimeout(() => setShowGoalSetup(false), 2000);
  }

  async function getAIMealPlan() {
    setAiLoading(true); setAiMeals(null); setAiError('');
    const cw = data.currentWeight;
    const gw = data.goalWeight;
    const tf = data.timeframeMonths;
    const kcal = data.dailyGoal;
    const weightContext = cw && gw
      ? `go from ${cw}kg to ${gw}kg in ${tf} month${tf > 1 ? 's' : ''}`
      : 'maintain a healthy weight';
    const prompt = `Create a full day meal plan for a busy mom who wants to ${weightContext}. Daily calorie target: ${kcal} kcal.

Return ONLY valid JSON (no markdown, no explanation):
{"meals":[{"name":"Oat porridge with berries","description":"Quick and filling","calories":320,"grams":350,"type":"breakfast","emoji":"🌅","prepTime":"5 min","cookTime":"10 min","ingredients":["80g oats","200ml milk","handful blueberries","1 tsp honey"],"steps":["Bring milk to a boil in a small pan.","Stir in oats and cook for 5 min, stirring often.","Pour into bowl and top with berries and honey."]}],"total":1510}

Include exactly 5 meals: breakfast, morning snack, lunch, afternoon snack, dinner. Each meal must include grams (portion size in grams), prepTime, cookTime, ingredients (with quantities), and steps (3-5 numbered steps). Target total close to ${kcal} kcal. Simple, quick, healthy, family-friendly.`;
    try {
      const raw = await askAI(prompt, 4096);
      // extract JSON from response (strip any markdown fences)
      const jsonStr = raw.replace(/```json\n?|```/g, '').trim();
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonStr.slice(start, end + 1));
      if (!parsed.meals || !Array.isArray(parsed.meals)) throw new Error('Invalid format');
      setAiMeals(parsed.meals as AIMeal[]);
      setAiTotal((parsed.total as number) ?? parsed.meals.reduce((s: number, m: AIMeal) => s + (m.calories ?? 0), 0));
    } catch {
      setAiError('Could not parse meal plan. Please try again.');
    }
    setAiLoading(false);
  }

  function addAllToToday() {
    if (!aiMeals) return;
    const newEntries: MealEntry[] = aiMeals.map(m => ({
      id: `m_${Date.now()}_${Math.random()}`,
      date: TODAY,
      name: m.name,
      calories: m.calories,
      mealType: (['breakfast','lunch','dinner'].includes(m.type) ? m.type : 'snack') as MealType,
    }));
    persist({ ...data, entries: [...newEntries, ...data.entries] });
    setAiMeals(null);
  }

  const kgToLose = data.currentWeight && data.goalWeight ? data.currentWeight - data.goalWeight : null;
  const motivational = kgToLose !== null
    ? kgToLose > 10 ? '💪 Every small step counts — you\'ve got this!'
    : kgToLose > 5 ? '🌟 You\'re making amazing progress, keep going!'
    : kgToLose > 2 ? '🎯 So close to your goal — stay consistent!'
    : kgToLose > 0 ? '🏆 Almost there! The final stretch is the hardest.'
    : '✨ You\'ve reached your goal weight — maintain it!'
    : '🌸 Set your weight goal to get a personalised plan!';

  const inp = { borderRadius: 12, padding: '9px 12px', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' } as const;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 14, background: 'var(--lavender-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🥗</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Calorie Tracker</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Daily goal: {data.dailyGoal} kcal</p>
        </div>
        <button onClick={() => setShowGoalSetup(s => !s)}
          style={{ fontSize: 11, color: 'var(--lavender)', background: 'var(--lavender-soft)', border: 'none', borderRadius: 10, padding: '6px 10px', fontWeight: 600, cursor: 'pointer' }}>
          ⚖️ Weight Goal
        </button>
      </div>

      {/* Weight goal setup */}
      <AnimatePresence>
        {showGoalSetup && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'var(--lavender-soft)', borderRadius: 18, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender)', marginBottom: 2 }}>Set Your Weight Goal</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Current weight (kg)</p>
                  <input value={cwInput} onChange={e => setCwInput(e.target.value)} type="number" inputMode="decimal" placeholder="e.g. 72" style={inp} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Goal weight (kg)</p>
                  <input value={gwInput} onChange={e => setGwInput(e.target.value)} type="number" inputMode="decimal" placeholder="e.g. 65" style={inp} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Timeframe</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TIMEFRAME_OPTIONS.map(t => (
                    <button key={t.months} onClick={() => setTfInput(t.months)}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 12, border: '2px solid', borderColor: tfInput === t.months ? 'var(--lavender)' : 'transparent',
                        background: tfInput === t.months ? 'var(--bg-card)' : 'transparent', fontSize: 10, fontWeight: 600,
                        color: tfInput === t.months ? 'var(--lavender)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={calculateGoal} disabled={!cwInput || !gwInput}
                style={{ height: 44, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)', color: '#fff', fontWeight: 700, fontSize: 14,
                  opacity: cwInput && gwInput ? 1 : 0.5, cursor: 'pointer' }}>
                Calculate My Goal
              </button>
              {calcResult && (
                <p style={{ fontSize: 12, fontWeight: 600, color: '#4A7A58', background: '#f0fdf4', borderRadius: 10, padding: '8px 12px', border: '1px solid #86efac' }}>
                  ✅ {calcResult}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress section */}
      {(data.currentWeight || data.goalWeight) && (
        <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            {data.currentWeight && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: <strong style={{ color: 'var(--text-primary)' }}>{data.currentWeight} kg</strong></span>}
            {data.goalWeight && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Goal: <strong style={{ color: 'var(--lavender)' }}>{data.goalWeight} kg</strong></span>}
          </div>
          {kgToLose !== null && kgToLose > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              You need to lose <strong style={{ color: '#ef4444' }}>{kgToLose.toFixed(1)} kg</strong> to reach your goal
            </p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{motivational}</p>
        </div>
      )}

      {/* Calorie progress bar */}
      <div>
        <div style={{ height: 12, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: barColor, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{consumed} kcal consumed</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: remaining < 0 ? '#ef4444' : '#8FA888' }}>
            {remaining < 0 ? `${Math.abs(remaining)} kcal over` : `${remaining} kcal remaining`}
          </span>
        </div>
      </div>

      {/* Today's meals */}
      {todayMeals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MEAL_TYPES.map(mt => {
            const meals = todayMeals.filter(m => m.mealType === mt.type);
            if (meals.length === 0) return null;
            return (
              <div key={mt.type}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--lavender)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{mt.emoji} {mt.label}</p>
                {meals.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: 12, padding: '7px 10px', marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lavender)', marginRight: 10 }}>{m.calories} kcal</span>
                    <button onClick={() => deleteMeal(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add meal — food lookup */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'var(--lavender-soft)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Meal type selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {MEAL_TYPES.map(mt => (
                  <button key={mt.type} onClick={() => setMealType(mt.type)}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 12, border: '2px solid',
                      borderColor: mealType === mt.type ? 'var(--lavender)' : 'transparent',
                      background: mealType === mt.type ? 'var(--bg-card)' : 'transparent',
                      fontSize: 10, fontWeight: 600,
                      color: mealType === mt.type ? 'var(--lavender)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                    {mt.emoji}<br />{mt.label}
                  </button>
                ))}
              </div>

              {/* Food search */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={foodQuery}
                  onChange={e => { setFoodQuery(e.target.value); setFoodResult(null); setFoodError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') lookupFood(); }}
                  placeholder="Ce ai mâncat? (ex: orez cu pui, salată, ou fiert)"
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={lookupFood} disabled={foodLookupLoading || !foodQuery.trim()}
                  style={{ padding: '9px 14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)',
                    color: '#fff', fontWeight: 600, fontSize: 13,
                    opacity: foodQuery.trim() && !foodLookupLoading ? 1 : 0.5, cursor: 'pointer', flexShrink: 0 }}>
                  {foodLookupLoading
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : '🔍'}
                </button>
              </div>

              {foodError && <p style={{ fontSize: 12, color: '#ef4444' }}>{foodError}</p>}

              {/* Result card */}
              {foodResult && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--lavender)' }}>
                  <span style={{ fontSize: 28 }}>{foodResult.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{foodResult.name}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 8, padding: '2px 8px' }}>⚖️ {foodResult.grams}g</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender)', background: 'var(--lavender-soft)', borderRadius: 8, padding: '2px 8px' }}>🔥 {foodResult.calories} kcal</span>
                    </div>
                  </div>
                  <button onClick={addFoodToLog}
                    style={{ padding: '8px 14px', borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)',
                      color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                    + Adaugă
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowForm(f => !f)}
          style={{ flex: 1, height: 42, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--lavender) 0%, #9B8CBD 100%)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          {showForm ? '✕ Cancel' : '+ Add Meal'}
        </button>
        <button onClick={getAIMealPlan} disabled={aiLoading}
          style={{ flex: 1, height: 42, borderRadius: 14, border: '1px solid var(--lavender)', background: 'var(--lavender-soft)', color: 'var(--lavender)', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
          {aiLoading ? '⏳ Generating...' : '✨ AI Meal Plan'}
        </button>
      </div>

      {aiError && <p style={{ fontSize: 12, color: '#ef4444' }}>{aiError}</p>}

      {/* AI meal plan cards */}
      <AnimatePresence>
        {aiMeals && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'linear-gradient(135deg, var(--lavender-soft) 0%, var(--peach-soft) 100%)', borderRadius: 18, padding: '14px', border: '1px solid var(--lavender)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender)' }}>✨ Your AI Meal Plan</p>
                <button onClick={() => setAiMeals(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {aiMeals.map((m, i) => {
                  const isExp = expandedMealIdx === i;
                  return (
                    <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden' }}>
                      {/* Card header — tap to expand */}
                      <button onClick={() => setExpandedMealIdx(isExp ? null : i)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{m.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.description}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender)' }}>🔥 {m.calories} kcal</span>
                          {m.grams && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>⚖️ {m.grams}g</span>}
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>👨‍🍳 {isExp ? 'ascunde' : 'rețetă'}</span>
                        </div>
                      </button>

                      {/* Expandable prep details */}
                      <AnimatePresence>
                        {isExp && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {/* Time badges */}
                              {(m.prepTime || m.cookTime) && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {m.prepTime && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--lavender-soft)', color: 'var(--lavender)', borderRadius: 9999, padding: '3px 10px' }}>⏱ {m.prepTime} prep</span>}
                                  {m.cookTime && <span style={{ fontSize: 11, fontWeight: 600, background: '#FFF0E8', color: '#C4784A', borderRadius: 9999, padding: '3px 10px' }}>🔥 {m.cookTime} cook</span>}
                                </div>
                              )}

                              {/* Ingredients chips */}
                              {m.ingredients && m.ingredients.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Ingredients</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                                    {m.ingredients.map((ing, j) => (
                                      <span key={j} style={{ fontSize: 11, background: '#EDF5ED', color: '#4A7A58', borderRadius: 20, padding: '3px 9px', fontWeight: 500 }}>{ing}</span>
                                    ))}
                                  </div>
                                  {uid && (
                                    <button
                                      onClick={() => {
                                        const shopKey = `mm_shopping_${uid}`;
                                        const existing = JSON.parse(localStorage.getItem(shopKey) || '[]');
                                        const newItems = (m.ingredients || []).map((ing: string) => ({
                                          id: crypto.randomUUID(), user_id: uid,
                                          name: `${ing} (${m.name})`,
                                          list_name: 'Meal Plan', checked: false,
                                          created_at: new Date().toISOString(),
                                        }));
                                        localStorage.setItem(shopKey, JSON.stringify([...existing, ...newItems]));
                                      }}
                                      style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#4A7A58', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                      🛒 Add to shopping list
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Steps */}
                              {m.steps && m.steps.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>How to prepare</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {m.steps.map((step, j) => (
                                      <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{
                                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                          background: 'linear-gradient(135deg, #C4788A 0%, #D4AF37 100%)',
                                          color: '#fff', fontSize: 10, fontWeight: 700,
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
              </div>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender)' }}>{aiTotal} kcal / {data.dailyGoal} kcal goal</span>
              </div>

              <button onClick={addAllToToday}
                style={{ width: '100%', height: 44, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--sage) 0%, #4A7A58 100%)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(74,122,88,0.3)' }}>
                ➕ Add all to today's log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// WELLNESS TAB — sub-components
// ─────────────────────────────────────────────

function WaterRing({ glasses, goal = 8 }: { glasses: number; goal?: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(glasses / goal, 1);
  const offset = circ * (1 - pct);
  const done = glasses >= goal;
  return (
    <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx="45" cy="45" r={r} fill="none"
          stroke={done ? 'var(--sage)' : 'var(--peach)'}
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: done ? 'var(--sage)' : 'var(--text-primary)' }}>{glasses}</p>
        <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>/{goal}</p>
      </div>
    </div>
  );
}

function WellnessChart({ logs }: { logs: WellnessLog[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, 'yyyy-MM-dd');
    const log = logs.find(l => l.date === key);
    return {
      label: format(d, 'EEEEE'), // single letter
      mood: log?.mood ?? null,
      sleep: log?.sleepHours ?? null,
      water: log?.water ?? 0,
    };
  });

  const W = 280;
  const H = 90;
  const colW = W / 7;
  const barW = colW * 0.25;

  const moodPts = days
    .map((d, i) => d.mood !== null ? { x: i * colW + colW / 2, y: H - (d.mood / 5) * 60 - 5 } : null)
    .filter(Boolean) as { x: number; y: number }[];

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        {[['var(--lavender)', 'Mood'], ['var(--accent)', 'Sleep'], ['#8FA888', 'Water']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block' }}>
        {days.map((d, i) => {
          const x = i * colW;
          const sleepH = d.sleep ? (d.sleep / 9) * 60 : 0;
          const waterH = d.water ? (d.water / 8) * 60 : 0;
          return (
            <g key={i}>
              <rect x={x + colW * 0.12} y={H - sleepH} width={barW} height={sleepH} rx="3" fill="var(--accent)" opacity="0.65" />
              <rect x={x + colW * 0.45} y={H - waterH} width={barW} height={waterH} rx="3" fill="#8FA888" opacity="0.65" />
              <text x={x + colW / 2} y={H + 15} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{d.label}</text>
            </g>
          );
        })}
        {moodPts.length > 1 && (
          <polyline points={moodPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--lavender)" strokeWidth="2" strokeLinejoin="round" />
        )}
        {moodPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--lavender)" />
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// WELLNESS TAB
// ─────────────────────────────────────────────

const MOODS_W = [
  { value: 1, emoji: '😔' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😊' },
];

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9];

function WellnessTab() {
  const { user } = useAuth();
  const [data, setData] = useState<WellnessData | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [water, setWater] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const affirmations = getAffirmations();
  const todayAffirmation = affirmations[new Date().getDate() % affirmations.length];

  useEffect(() => {
    if (!user) return;
    const d = loadWellnessData(user.id);
    setData(d);
    const todayLog = d.logs.find(l => l.date === TODAY);
    if (todayLog) {
      setMood(todayLog.mood);
      setSleep(todayLog.sleepHours);
      setWater(todayLog.water);
    }
  }, [user]);

  function saveToday(updates: Partial<{ mood: number | null; sleep: number | null; water: number }>) {
    if (!user || !data) return;
    const newMood = updates.mood !== undefined ? updates.mood : mood;
    const newSleep = updates.sleep !== undefined ? updates.sleep : sleep;
    const newWater = updates.water !== undefined ? updates.water : water;

    const logs = data.logs.filter(l => l.date !== TODAY);
    logs.push({ date: TODAY, mood: newMood, sleepHours: newSleep, water: newWater });
    const updated: WellnessData = { ...data, logs };
    setData(updated);
    saveWellnessData(user.id, updated);

    if (updates.mood !== undefined) setMood(newMood);
    if (updates.sleep !== undefined) setSleep(newSleep);
    if (updates.water !== undefined) setWater(newWater);
  }

  function saveJournal() {
    if (!user || !data || !journalText.trim()) return;
    const entry: JournalEntry = { id: `j_${Date.now()}`, date: TODAY, text: journalText.trim() };
    const journal = [entry, ...data.journal.filter(j => j.date !== TODAY)];
    const updated: WellnessData = { ...data, journal };
    setData(updated);
    saveWellnessData(user.id, updated);
    setJournalText('');
  }

  function deleteJournal(id: string) {
    if (!user || !data) return;
    const updated: WellnessData = { ...data, journal: data.journal.filter(j => j.id !== id) };
    setData(updated);
    saveWellnessData(user.id, updated);
  }

  const last7Logs = data?.logs.filter(l => {
    const d = new Date(l.date);
    return d >= subDays(new Date(), 6);
  }) ?? [];

  return (
    <div className="px-4 mt-3 flex flex-col gap-4 pb-24">
      {/* Affirmation */}
      <div style={{
        borderRadius: 20, padding: '16px',
        background: 'linear-gradient(135deg, var(--lavender-soft) 0%, var(--peach-soft) 100%)',
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lavender)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Today's affirmation</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{todayAffirmation}</p>
      </div>

      {/* Mood + Sleep + Water row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {/* Mood */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '12px 10px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>Mood</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {MOODS_W.map(m => (
              <button key={m.value} onClick={() => saveToday({ mood: mood === m.value ? null : m.value })}
                style={{
                  fontSize: mood === m.value ? 22 : 17,
                  opacity: mood === null || mood === m.value ? 1 : 0.4,
                  transition: 'all 0.15s',
                  background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
                }}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '12px 10px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>Sleep</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {SLEEP_OPTIONS.map(h => (
              <button key={h} onClick={() => saveToday({ sleep: sleep === h ? null : h })}
                style={{
                  borderRadius: 8, border: 'none', padding: '3px 0', fontSize: 11, fontWeight: 500,
                  background: sleep === h ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'var(--bg-primary)',
                  color: sleep === h ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>
                {h}h{h === 9 ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Water */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textAlign: 'center' }}>Water</p>
          <WaterRing glasses={water} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => saveToday({ water: Math.max(0, water - 1) })}
              style={{ width: 28, height: 28, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>−</button>
            <button onClick={() => saveToday({ water: Math.min(12, water + 1) })}
              style={{ width: 28, height: 28, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sage) 0%, #6B9462 100%)', color: '#fff', fontSize: 14, fontWeight: 700 }}>+</button>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Weekly Overview</p>
        <WellnessChart logs={last7Logs} />
      </div>

      {/* Journal */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '16px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>How are you feeling today?</p>
        <textarea
          value={journalText}
          onChange={e => setJournalText(e.target.value)}
          placeholder="Write freely — this is your private space..."
          rows={3}
          style={{
            width: '100%', borderRadius: 14, padding: '10px 12px', fontSize: 13, lineHeight: 1.6,
            background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            outline: 'none', resize: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={saveJournal} disabled={!journalText.trim()}
          style={{
            marginTop: 10, width: '100%', height: 44, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, var(--peach) 0%, #D4896A 100%)',
            color: '#fff', fontWeight: 600, fontSize: 14, opacity: journalText.trim() ? 1 : 0.5,
          }}>
          Save entry
        </button>

        {/* Past entries */}
        {data && data.journal.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent entries</p>
            {data.journal.slice(0, 7).map(entry => (
              <div key={entry.id} style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {format(new Date(entry.date), 'EEE, d MMM')}
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                      style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {expandedEntry === entry.id ? 'less' : 'more'}
                    </button>
                    <button onClick={() => deleteJournal(entry.id)}
                      style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {expandedEntry === entry.id ? entry.text : `${entry.text.slice(0, 100)}${entry.text.length > 100 ? '...' : ''}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout Tracker */}
      <WorkoutTracker uid={user?.id ?? ''} />

      {/* Calorie & Meal Tracker */}
      <CalorieTracker uid={user?.id ?? ''} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

export function SelfCareScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SCTab>('routines');

  const tabs: { key: SCTab; label: string }[] = [
    { key: 'routines', label: t('selfcare.routinesTab') },
    { key: 'skincare', label: t('selfcare.skincareTab') },
    { key: 'wellness', label: t('selfcare.wellnessTab') },
  ];

  return (
    <Layout background="url('/bg-selfcare.jpg') center/cover no-repeat">
      <div className="px-5 pt-5 pb-2">
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#fff', letterSpacing: '-0.01em', margin: 0, textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>{t('selfcare.title')}</h1>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', margin: '12px 16px 0', borderRadius: 16, padding: 4, gap: 4,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}>
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 12, border: 'none',
            fontSize: 13, fontWeight: 600,
            background: tab === tb.key ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : 'transparent',
            color: tab === tb.key ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>{tb.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === 'routines' && <RoutinesTab />}
          {tab === 'skincare' && <SkincareTab />}
          {tab === 'wellness' && <WellnessTab />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
