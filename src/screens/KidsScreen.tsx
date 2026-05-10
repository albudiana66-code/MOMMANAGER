import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInYears, parseISO, format } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../lib/anthropic';
import type { Kid, KidMilestone } from '../types';

const AVATARS = ['👶', '🧒', '👧', '👦', '🧒‍♀️', '🧒‍♂️'];

const milestoneColors: Record<KidMilestone['category'], string> = {
  health: '#ef4444',
  school: '#3b82f6',
  activity: '#f59e0b',
  firstTime: '#E91E8C',
};

const SCHOOL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

type SchoolMealDay = { main: string; snack: string; drink: string; fruit: string };
type SchoolMealPlan = Record<string, SchoolMealDay>;

type Activity = { id: string; name: string; day: string; time: string; location: string };

type Story = { id: string; title: string; content: string; ageGroup: string; theme: string; savedAt: string };

type KidTab = 'milestones' | 'schoolMeals' | 'activities' | 'stories';

// ---------- localStorage helpers ----------
const KIDS_KEY = (userId: string) => `mm_kids_${userId}`;
const MILESTONES_KEY = (kidId: string) => `mm_milestones_${kidId}`;
const STORIES_KEY = (kidId: string) => `mm_stories_${kidId}`;

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
function loadStories(kidId: string): Story[] {
  try { return JSON.parse(localStorage.getItem(STORIES_KEY(kidId)) || '[]'); } catch { return []; }
}
function saveStories(kidId: string, stories: Story[]) {
  localStorage.setItem(STORIES_KEY(kidId), JSON.stringify(stories));
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

// ---------- MILESTONES TAB ----------
function MilestonesTab({ kid, milestones, onAddMilestone, onDeleteMilestone }: {
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
Examples: main="Cheese sandwich", snack="Rice cakes", drink="Water bottle", fruit="Apple"`;
      const raw = await askAI(prompt, 1024, i18n.language);
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
        style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
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
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C]/20 flex items-center justify-center text-sm flex-shrink-0">🏃</div>
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

// ---------- STORIES TAB ----------
function StoriesTab({ kid }: { kid: Kid }) {
  const { t, i18n } = useTranslation();
  const [ageGroup, setAgeGroup] = useState('young');
  const [theme, setTheme] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState('');
  const [stories, setStories] = useState<Story[]>(() => loadStories(kid.id));

  const ageGroupOptions = [
    { value: 'toddler', label: t('kids.ageToddler') },
    { value: 'young', label: t('kids.ageYoung') },
    { value: 'older', label: t('kids.ageOlder') },
  ];

  async function generateStory() {
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      const ageDesc = ageGroup === 'toddler' ? '2-4 years old' : ageGroup === 'young' ? '5-8 years old' : '9-12 years old';
      const wordCount = ageGroup === 'toddler' ? '300-400' : ageGroup === 'young' ? '500-600' : '500-600';
      const lang = i18n.language;
      const fictionalNames = ['Luna', 'Zoe', 'Alex', 'Mia', 'Leo', 'Aria', 'Max', 'Sofia', 'Oliver', 'Emma'];
      const heroName = fictionalNames[Math.floor(Math.random() * fictionalNames.length)];
      const age = differenceInYears(new Date(), parseISO(kid.birthdate));
      const prompt = `You are a professional children's story writer. Write a magical bedtime story for a ${ageDesc} child (reader age: ${age}).

STRICT RULES — follow every rule exactly:
1. The main character MUST be named ${heroName} — a completely fictional character. Do NOT use the real child's name anywhere in the story.
2. Story theme: ${theme}
3. Length: exactly ${wordCount} words.
4. Structure: clear beginning, middle, and end. Include adventure, friendship, and a positive moral lesson. End with a warm, cozy bedtime closing.
5. Language & grammar: write in ${lang}. Every sentence must be grammatically perfect. Use age-appropriate vocabulary for ${ageDesc}.
6. Formatting: plain text only. No asterisks (*), no markdown symbols (#, **, _, etc.), no bullet points. Use proper paragraph breaks with blank lines between paragraphs.
7. Tone: warm, imaginative, engaging, suitable for reading aloud at bedtime.

Begin the story directly — no title, no preamble.`;
      const result = await askAI(prompt, 1500, lang);
      setCurrentStory(result);
    } catch { /* silent */ } finally {
      setGenerating(false);
    }
  }

  function saveStory() {
    if (!currentStory) return;
    const story: Story = {
      id: crypto.randomUUID(),
      title: `${kid.name} — ${theme}`,
      content: currentStory,
      ageGroup,
      theme,
      savedAt: new Date().toISOString(),
    };
    const updated = [story, ...stories];
    setStories(updated);
    saveStories(kid.id, updated);
    setCurrentStory('');
    setTheme('');
  }

  function deleteStory(id: string) {
    const updated = stories.filter((s) => s.id !== id);
    setStories(updated);
    saveStories(kid.id, updated);
  }

  return (
    <div>
      {/* Generator */}
      <Card className="mb-4">
        <Select label={t('kids.ageGroup')} value={ageGroup} options={ageGroupOptions} onChange={(e) => setAgeGroup(e.target.value)} />
        <div className="mt-3">
          <Input
            label={t('kids.storyTheme')}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={t('kids.storyThemePlaceholder')}
          />
        </div>
        <button
          onClick={generateStory}
          disabled={generating || !theme.trim()}
          className="w-full mt-3 py-3 rounded-2xl font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 100%)' }}
        >
          {generating ? '...' : t('kids.generateStoryBtn')}
        </button>
      </Card>

      {/* Generated story */}
      {currentStory && (
        <Card className="mb-4">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap mb-3">{currentStory}</p>
          <Button onClick={saveStory} className="w-full">{t('kids.saveStory')}</Button>
        </Card>
      )}

      {/* Saved stories */}
      <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">{t('kids.savedStories')}</h4>
      {stories.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">{t('kids.noStories')}</p>
      ) : (
        stories.map((story) => (
          <div key={story.id} className="bg-[var(--bg-card)] rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">📖 {story.title}</p>
              <button onClick={() => deleteStory(story.id)} className="text-[var(--text-secondary)] hover:text-red-400 text-sm flex-shrink-0">✕</button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-3">{story.content}</p>
            <p className="text-[10px] text-[var(--text-secondary)] opacity-50 mt-2">
              {format(parseISO(story.savedAt), 'MMM d, yyyy')}
            </p>
          </div>
        ))
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
  const [kidTab, setKidTab] = useState<KidTab>('milestones');
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

  useEffect(() => {
    if (!user) return;
    setKids(loadKids(user.id));
  }, [user]);

  function loadMilestonesForKid(kidId: string) {
    if (milestones[kidId]) return;
    setMilestones((prev) => ({ ...prev, [kidId]: loadMilestonesLocal(kidId) }));
  }

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
    }
    setShowKidForm(false);
  }

  function deleteKid(id: string) {
    if (!user) return;
    const updated = kids.filter((k) => k.id !== id);
    setKids(updated);
    saveKids(user.id, updated);
    if (selectedKid?.id === id) setSelectedKid(null);
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
    { key: 'milestones', label: t('kids.milestonesTab') },
    { key: 'schoolMeals', label: t('kids.schoolMealsTab') },
    { key: 'activities', label: t('kids.activitiesTab') },
    { key: 'stories', label: t('kids.storiesTab') },
  ];

  return (
    <Layout>
      <Header title={t('kids.title')} />

      <div className="px-4 mt-3">
        {kids.length === 0 ? (
          <p className="text-center text-[var(--text-secondary)] text-sm py-8">{t('kids.noKids')}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {kids.map((kid) => {
              const age = differenceInYears(new Date(), parseISO(kid.birthdate));
              const isSelected = selectedKid?.id === kid.id;
              return (
                <motion.button
                  key={kid.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedKid(isSelected ? null : kid);
                    if (!isSelected) loadMilestonesForKid(kid.id);
                  }}
                  className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border transition-colors flex-shrink-0 ${
                    isSelected ? 'bg-[#E91E8C]/10 border-[#E91E8C]' : 'bg-[var(--bg-card)] border-white/10'
                  }`}
                >
                  <span className="text-3xl">{kid.avatar || '👶'}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{kid.name}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">{t('kids.age', { years: age })}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {selectedKid && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4">
              {/* Kid header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--text-primary)]">{selectedKid.name}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openKidForm(selectedKid)}>✏️</Button>
                  <Button variant="danger" size="sm" onClick={() => deleteKid(selectedKid.id)}>🗑️</Button>
                </div>
              </div>

              {selectedKid.notes && (
                <Card className="mb-3">
                  <p className="text-sm text-[var(--text-secondary)]">{selectedKid.notes}</p>
                </Card>
              )}

              {/* Kid tabs */}
              <div className="flex bg-[var(--bg-card)] rounded-2xl p-1 gap-1 mb-4 overflow-x-auto no-scrollbar">
                {kidTabs.map((tb) => (
                  <button
                    key={tb.key}
                    onClick={() => setKidTab(tb.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      kidTab === tb.key ? 'bg-[#E91E8C] text-white' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {kidTab === 'milestones' && (
                <MilestonesTab
                  kid={selectedKid}
                  milestones={milestones[selectedKid.id] || []}
                  onAddMilestone={() => setShowMilestoneForm(true)}
                  onDeleteMilestone={(id) => deleteMilestone(selectedKid.id, id)}
                />
              )}
              {kidTab === 'schoolMeals' && <SchoolMealsTab kid={selectedKid} />}
              {kidTab === 'activities' && <ActivitiesTab kid={selectedKid} />}
              {kidTab === 'stories' && <StoriesTab kid={selectedKid} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <button
        onClick={() => openKidForm()}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[#E91E8C] shadow-lg shadow-pink-500/30 flex items-center justify-center text-white text-2xl z-30 active:scale-95 transition-transform"
        aria-label={t('kids.addKid')}
      >
        +
      </button>

      {/* Kid form */}
      <Modal open={showKidForm} onClose={() => setShowKidForm(false)} title={editingKid ? t('kids.editKid') : t('kids.addKid')}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">{t('kids.avatar')}</label>
            <div className="flex gap-3 flex-wrap">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)}
                  className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-colors ${avatar === a ? 'bg-[#E91E8C]/20 border-2 border-[#E91E8C]' : 'bg-[var(--bg-primary)]'}`}
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
