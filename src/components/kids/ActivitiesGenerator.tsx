import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAIConsent } from '../../context/AIConsentContext';
import { askAI } from '../../lib/anthropic';

interface GeneratedActivity {
  title: string;
  emoji: string;
  description: string;
  steps: string[];
  materials: string[];
  duration: string;
  benefit: string;
  difficulty: string;
}

interface SavedActivity extends GeneratedActivity {
  id: string;
  savedAt: string;
}

const SAVED_KEY = (uid: string) => `mm_saved_activities_${uid}`;

function loadSaved(uid: string): SavedActivity[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY(uid)) || '[]'); } catch { return []; }
}
function persistSaved(uid: string, items: SavedActivity[]) {
  localStorage.setItem(SAVED_KEY(uid), JSON.stringify(items));
}

const AGE_GROUPS = ['0-2 yrs', '3-5 yrs', '6-9 yrs', '10+ yrs'] as const;
const CATEGORIES = ['Creative', 'Educational', 'Physical', 'Relaxing', 'Outdoor', 'Rainy day'] as const;
const DURATIONS = ['15 min', '30 min', '1 hour', 'Afternoon'] as const;
const MATERIALS_OPTIONS = ['None needed', 'Basic', 'Craft supplies', 'Kitchen'] as const;

type AgeGroup = typeof AGE_GROUPS[number];
type Duration = typeof DURATIONS[number];
type MaterialsOption = typeof MATERIALS_OPTIONS[number];

const PILL_BASE: React.CSSProperties = {
  borderRadius: 9999,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  flexShrink: 0,
};

const PILL_OFF: React.CSSProperties = {
  ...PILL_BASE,
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
};

const PILL_ON: React.CSSProperties = {
  ...PILL_BASE,
  background: 'var(--lavender)',
  color: '#fff',
  border: '1px solid var(--lavender)',
};

function difficultyBadge(difficulty: string) {
  const d = difficulty.toLowerCase();
  if (d === 'hard') return { bg: 'var(--accent-soft)', color: 'var(--accent)' };
  if (d === 'medium') return { bg: '#FFF0E8', color: '#C4784A' };
  return { bg: '#EDF5ED', color: '#4A7A58' };
}

function ActivityCard({ activity, onSave, saved }: {
  activity: GeneratedActivity;
  onSave: () => void;
  saved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = difficultyBadge(activity.difficulty);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 24,
      padding: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{activity.emoji}</span>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{activity.title}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, borderRadius: 9999,
          padding: '3px 8px', flexShrink: 0,
          background: badge.bg, color: badge.color,
          textTransform: 'capitalize',
        }}>
          {activity.difficulty}
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
        {activity.description}
      </p>

      {/* Info row */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <span style={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 10px', color: 'var(--text-secondary)' }}>
          ⏱ {activity.duration}
        </span>
        <span style={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 10px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🌱 {activity.benefit}
        </span>
      </div>

      {/* Materials */}
      {activity.materials && activity.materials.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {activity.materials.map((m, i) => (
            <span key={i} style={{ fontSize: 12, background: '#FFF0E8', color: '#C4784A', borderRadius: 9999, padding: '3px 10px', fontWeight: 500 }}>
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Steps toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
      >
        Steps {expanded ? '▲' : '▼'}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-2 mt-2">
              {activity.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: '#EDE8F5', color: '#7B66A8',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i + 1}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button */}
      <div className="flex justify-end mt-3">
        <button
          onClick={onSave}
          disabled={saved}
          style={{
            fontSize: 13, fontWeight: 500, borderRadius: 9999,
            padding: '6px 14px', border: 'none',
            background: saved ? 'transparent' : 'var(--accent-soft)',
            color: saved ? 'var(--sage)' : 'var(--accent)',
            cursor: saved ? 'default' : 'pointer',
          }}
        >
          {saved ? 'Saved ✓' : 'Save ♡'}
        </button>
      </div>
    </div>
  );
}

export function ActivitiesGenerator() {
  const { user } = useAuth();
  const { requestAiConsent } = useAIConsent();

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('3-5 yrs');
  const [categories, setCategories] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration>('30 min');
  const [materials, setMaterials] = useState<MaterialsOption>('None needed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<GeneratedActivity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>(() =>
    user ? loadSaved(user.id) : []
  );

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function generate() {
    const consented = await requestAiConsent();
    if (!consented) return;
    setLoading(true);
    setError('');
    setActivities([]);
    setSavedIds(new Set());
    try {
      const prompt = `Generate 3 fun hands-on home activities for a child aged ${ageGroup}.
Category preference: ${categories.length > 0 ? categories.join(', ') : 'any'}
Duration: ${duration}
Materials available: ${materials}

IMPORTANT: Strongly prefer creative, tactile, and craft-based activities such as:
- Coloring and drawing (with crayons, markers, watercolors)
- Plasticine / clay modelling (animals, food, letters, shapes)
- Paper crafts (cutting shapes, folding, origami, paper chains, collage)
- Painting (finger painting, sponge painting, potato stamping)
- Sensory play (sand, water, rice trays, kinetic sand)
- Nature crafts (leaf rubbings, flower pressing, rock painting)
- Building and constructing (cardboard boxes, sticks, tape)
- Sticker art, decoupage, or mosaic with torn paper
Only suggest screen-free, hands-on activities a child can do at home with a parent or alone.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "title": "Activity name",
    "emoji": "one relevant emoji",
    "description": "2-3 sentences describing the activity",
    "steps": ["step 1", "step 2", "step 3", "step 4"],
    "materials": ["item 1", "item 2"],
    "duration": "X minutes",
    "benefit": "developmental benefit in one sentence",
    "difficulty": "easy"
  }
]`;

      const raw = await askAI(prompt, 1000);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Invalid response format');
      const clean = match[0].replace(/```json|```/g, '').trim();
      const parsed: GeneratedActivity[] = JSON.parse(clean);
      setActivities(parsed);
    } catch {
      setError('Could not generate activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function saveActivity(activity: GeneratedActivity, index: number) {
    if (!user) return;
    const key = `${index}-${activity.title}`;
    if (savedIds.has(key)) return;

    const saved: SavedActivity = {
      ...activity,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    const updated = [saved, ...savedActivities];
    setSavedActivities(updated);
    persistSaved(user.id, updated);
    setSavedIds((prev) => new Set([...prev, key]));
  }

  function deleteSaved(id: string) {
    if (!user) return;
    const updated = savedActivities.filter((a) => a.id !== id);
    setSavedActivities(updated);
    persistSaved(user.id, updated);
  }

  return (
    <div>
      {/* Section label */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
        🧸 Activity Ideas
      </p>

      {/* Filter card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, marginBottom: 16 }}>
        {/* Age group */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Age group</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {AGE_GROUPS.map((ag) => (
            <button key={ag} onClick={() => setAgeGroup(ag)} style={ageGroup === ag ? PILL_ON : PILL_OFF}>
              {ag}
            </button>
          ))}
        </div>

        {/* Category (multi) */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Category <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(pick any)</span></p>
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => toggleCategory(cat)} style={categories.includes(cat) ? PILL_ON : PILL_OFF}>
              {cat}
            </button>
          ))}
        </div>

        {/* Duration */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Duration</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {DURATIONS.map((d) => (
            <button key={d} onClick={() => setDuration(d)} style={duration === d ? PILL_ON : PILL_OFF}>
              {d}
            </button>
          ))}
        </div>

        {/* Materials */}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Materials</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {MATERIALS_OPTIONS.map((m) => (
            <button key={m} onClick={() => setMaterials(m)} style={materials === m ? PILL_ON : PILL_OFF}>
              {m}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: '100%', height: 52, borderRadius: 16,
            background: loading ? 'var(--border)' : 'linear-gradient(135deg, #C4B8D8 0%, #9B8CBD 100%)',
            color: '#fff', fontWeight: 600, fontSize: 15,
            border: 'none', cursor: loading ? 'default' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Finding activities...
            </>
          ) : (
            'Generate Activities ✨'
          )}
        </button>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--accent)', marginTop: 10, textAlign: 'center' }}>{error}</p>
        )}
      </div>

      {/* Activity cards */}
      <AnimatePresence>
        {activities.map((activity, i) => {
          const key = `${i}-${activity.title}`;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.25 }}
              style={{ marginBottom: 12 }}
            >
              <ActivityCard
                activity={activity}
                saved={savedIds.has(key)}
                onSave={() => saveActivity(activity, i)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Saved Activities */}
      {savedActivities.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="flex items-center gap-2 mb-3">
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Saved Activities</p>
            <span style={{
              fontSize: 11, fontWeight: 700, background: 'var(--lavender)', color: '#fff',
              borderRadius: 9999, padding: '2px 7px',
            }}>
              {savedActivities.length}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {savedActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  width: 160, flexShrink: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: 12,
                  position: 'relative',
                }}
              >
                <button
                  onClick={() => deleteSaved(act.id)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    fontSize: 10, color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
                <p style={{ fontSize: 28, marginBottom: 6 }}>{act.emoji}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>{act.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱ {act.duration}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
