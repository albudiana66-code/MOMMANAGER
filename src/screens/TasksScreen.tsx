import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { CalendarView } from '../components/tasks/CalendarView';
import { WeekView } from '../components/tasks/WeekView';
import { DayView } from '../components/tasks/DayView';
import { QuickAddSheet } from '../components/tasks/QuickAddSheet';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useDateFnsLocale } from '../hooks/useDateFnsLocale';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import type { NotificationDeepLinkState } from '../hooks/useNotificationDeepLink';
import i18n from '../i18n';
import type { Task, CalendarEvent } from '../types';

type MainTab = 'list' | 'calendar';
type CalView = 'month' | 'week' | 'day';
type StatusFilter = 'all' | 'pending' | 'completed';
type PlanFilter = 'all' | 'mom' | 'kids' | 'family';

// ── localStorage helpers ──────────────────────────────────────
const TASKS_KEY = (uid: string) => `mm_tasks_${uid}`;
const EVENTS_KEY = (uid: string) => `mm_events_${uid}`;

function loadTasks(uid: string): Task[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY(uid)) || '[]'); } catch { return []; }
}
function saveTasks(uid: string, tasks: Task[]) {
  localStorage.setItem(TASKS_KEY(uid), JSON.stringify(tasks));
}
function loadEvents(uid: string): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY(uid)) || '[]'); } catch { return []; }
}
function saveEvents(uid: string, events: CalendarEvent[]) {
  localStorage.setItem(EVENTS_KEY(uid), JSON.stringify(events));
}

// ── ICS helpers ──────────────────────────────────────────────

function downloadICS(title: string, id: string, date: string, time?: string, description = 'From MomManager') {
  const dateStr = date.replace(/-/g, '');
  const timeStr = time ? time.replace(':', '') + '00' : '090000';
  const dtStart = `${dateStr}T${timeStr}`;
  const endHour = String((parseInt(timeStr.slice(0, 2)) + 1) % 24).padStart(2, '0');
  const dtEnd = `${dateStr}T${endHour}${timeStr.slice(2, 4)}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MomManager//EN',
    'BEGIN:VEVENT',
    `UID:${id}@mommanager`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Weekly Recap ──────────────────────────────────────────────
function WeeklyRecap({ tasks }: { tasks: Task[] }) {
  const dateLocale = useDateFnsLocale();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const PLAN_COLORS: Record<string, string> = {
    mom: 'var(--accent)',
    kids: 'var(--lavender)',
    family: 'var(--sage)',
  };

  function tasksOnDay(day: Date) {
    const ds = format(day, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === ds);
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{i18n.t('tasks.thisWeek')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i18n.t('tasks.doneOfTotal', { done, total })}</p>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginBottom: 12, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))' }}
        />
      </div>
      {/* Day dots */}
      <div className="flex justify-between">
        {days.map((day) => {
          const dayTasks = tasksOnDay(day);
          const todayDay = isToday(day);
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: todayDay ? 'var(--accent)' : 'var(--text-muted)' }}>
                {format(day, 'EEE', { locale: dateLocale })[0]}
              </span>
              <div
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: todayDay ? 'var(--accent)' : dayTasks.length > 0 ? 'var(--accent-soft)' : 'var(--bg-primary)',
                  border: todayDay ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {dayTasks.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: todayDay ? '#fff' : 'var(--accent)' }}>
                    {dayTasks.length}
                  </span>
                )}
              </div>
              {/* plan dot */}
              <div style={{ height: 4, display: 'flex', gap: 2 }}>
                {[...new Set(dayTasks.map((t) => t.plan || 'mom'))].slice(0, 2).map((plan, i) => (
                  <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: PLAN_COLORS[plan] }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day Panel (shown below month calendar when a day is selected) ──
function DayPanel({ date, tasks, events, onClose, onAddEvent }: {
  date: string;
  tasks: Task[];
  events: CalendarEvent[];
  onClose: () => void;
  onAddEvent: (date: string) => void;
}) {
  const dateLocale = useDateFnsLocale();
  const dayTasks = tasks.filter((t) => t.due_date === date);
  const dayEvents = events.filter((e) => e.date === date);

  const PLAN_COLORS: Record<string, string> = {
    mom: 'var(--accent)',
    kids: 'var(--lavender)',
    family: 'var(--sage)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, marginTop: 12 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {format(parseISO(date + 'T00:00:00'), 'EEEE, MMMM d', { locale: dateLocale })}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddEvent(date)}
            style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '5px 10px', cursor: 'pointer' }}
          >
            + {i18n.t('tasks.addEvent')}
          </button>
          <button onClick={onClose} style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>
      </div>

      {dayTasks.length === 0 && dayEvents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>{i18n.t('tasks.nothingScheduled')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dayTasks.map((t) => (
            <div key={t.id} style={{
              borderLeft: `3px solid ${PLAN_COLORS[t.plan || 'mom']}`,
              background: 'var(--bg-primary)', borderRadius: 10, padding: '8px 12px',
            }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</p>
                  {t.time && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>⏰ {t.time}</p>}
                  {t.has_reminder && <p style={{ fontSize: 10, color: 'var(--accent)' }}>🔔 {i18n.t('tasks.reminderSet')}</p>}
                </div>
                <button
                  onClick={() => downloadICS(t.title, t.id, date, t.time, t.description)}
                  style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 7, padding: '3px 7px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}
                >
                  📅 .ics
                </button>
              </div>
            </div>
          ))}
          {dayEvents.map((e) => (
            <div key={e.id} style={{
              borderLeft: `3px solid ${e.color || PLAN_COLORS[e.plan || 'mom']}`,
              background: 'var(--bg-primary)', borderRadius: 10, padding: '8px 12px',
            }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</p>
                  {e.time && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>⏰ {e.time}</p>}
                </div>
                <button
                  onClick={() => downloadICS(e.title, e.id, date, e.time)}
                  style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 7, padding: '3px 7px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}
                >
                  📅 .ics
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────
export function TasksScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [mainTab, setMainTab] = useState<MainTab>('list');
  const [calView, setCalView] = useState<CalView>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const { resync } = useNotificationSettings();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const loadedTasks = loadTasks(user.id);
    const loadedEvents = loadEvents(user.id);
    setTasks(loadedTasks);
    setEvents(loadedEvents);

    // Opened from a tapped notification — jump to the exact item.
    const deepLink = location.state as NotificationDeepLinkState | null;
    if (deepLink?.notifType === 'event') {
      const event = loadedEvents.find((e) => e.id === deepLink.notifItemId);
      if (event) {
        setMainTab('calendar');
        setCalView('month');
        setSelectedDate(event.date);
      }
    } else if (deepLink?.notifType === 'task') {
      setMainTab('list');
      setStatusFilter('all');
      setPlanFilter('all');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleSaveTask(partial: Partial<Task>) {
    if (!user) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      user_id: user.id,
      title: partial.title!,
      description: partial.description,
      due_date: partial.due_date,
      time: partial.time,
      completed: false,
      category: partial.category ?? 'personal',
      priority: partial.priority ?? 'medium',
      plan: partial.plan ?? 'mom',
      has_reminder: partial.has_reminder,
      reminder_minutes_before: partial.reminder_minutes_before,
      created_at: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasks(user.id, updated);
    resync();
    setShowTaskForm(false);
  }

  function handleSaveEvent(event: CalendarEvent) {
    if (!user) return;
    const updated = [event, ...events];
    setEvents(updated);
    saveEvents(user.id, updated);
    resync();
    setSheetDate(null);
  }

  function handleToggle(id: string) {
    if (!user) return;
    const updated = tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    saveTasks(user.id, updated);
    resync();
  }

  function handleDelete(id: string) {
    if (!user) return;
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(user.id, updated);
    resync();
  }

  function openAddEvent(date: string) {
    setSheetDate(date);
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (planFilter !== 'all' && (t.plan || 'mom') !== planFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, planFilter]);

  const PLAN_PILLS: { id: PlanFilter; label: string; color: string }[] = [
    { id: 'all', label: t('tasks.all'), color: 'var(--accent)' },
    { id: 'mom', label: `🌸 ${t('tasks.planMom')}`, color: 'var(--accent)' },
    { id: 'kids', label: `🧸 ${t('tasks.planKids')}`, color: 'var(--lavender)' },
    { id: 'family', label: `🏠 ${t('tasks.planFamily')}`, color: 'var(--sage)' },
  ];

  const CAL_TABS: { id: CalView; label: string }[] = [
    { id: 'month', label: t('tasks.monthView') },
    { id: 'week', label: t('tasks.weekView') },
    { id: 'day', label: t('tasks.dayView') },
  ];

  return (
    <Layout background="url('/bg-tasks.png') center/cover no-repeat">
      <div className="px-5 pt-5 pb-2">
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#3D2B1F', letterSpacing: '-0.01em', margin: 0 }}>{t('tasks.title')}</h1>
      </div>

      {/* Main tab bar */}
      <div className="flex mx-4 mt-3 rounded-2xl p-1 gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['list', 'calendar'] as MainTab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setMainTab(tb)}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={mainTab === tb ? {
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: '#fff',
            } : { color: 'var(--text-secondary)' }}
          >
            {tb === 'list' ? t('tasks.title') : t('tasks.calendar')}
          </button>
        ))}
      </div>

      {mainTab === 'list' ? (
        <div className="px-4 mt-3 pb-28">
          {/* Weekly recap */}
          <WeeklyRecap tasks={tasks} />

          {/* Status filter pills */}
          <div className="flex gap-2 mb-3">
            {(['all', 'pending', 'completed'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                style={statusFilter === f ? {
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: '#fff',
                } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {t(`tasks.${f}`)}
              </button>
            ))}
          </div>

          {/* Plan filter pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {PLAN_PILLS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanFilter(p.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex-shrink-0"
                style={planFilter === p.id ? {
                  background: p.color,
                  color: '#fff',
                } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Task list */}
          <AnimatePresence initial={false}>
            {filteredTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-4xl mb-3">📋</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('tasks.noTasks')}</p>
              </motion.div>
            ) : (
              filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  <TaskItem task={task} onToggle={handleToggle} onDelete={handleDelete} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="px-4 mt-3 pb-28">
          {/* Calendar sub-tabs */}
          <div className="flex gap-1 mb-3 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {CAL_TABS.map((ct) => (
              <button
                key={ct.id}
                onClick={() => { setCalView(ct.id); setSelectedDate(null); }}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                style={calView === ct.id ? {
                  background: 'var(--accent)',
                  color: '#fff',
                } : { color: 'var(--text-secondary)' }}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {/* Calendar views */}
          {calView === 'month' && (
            <>
              <CalendarView
                events={events}
                tasks={tasks}
                onDayClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
                selectedDate={selectedDate}
              />
              <AnimatePresence>
                {selectedDate && (
                  <DayPanel
                    date={selectedDate}
                    tasks={tasks}
                    events={events}
                    onClose={() => setSelectedDate(null)}
                    onAddEvent={(date) => { setSelectedDate(null); openAddEvent(date); }}
                  />
                )}
              </AnimatePresence>
            </>
          )}

          {calView === 'week' && (
            <WeekView
              tasks={tasks}
              events={events}
              onDayClick={(date) => { setCalView('day'); setSelectedDate(date); }}
              onAddEvent={openAddEvent}
            />
          )}

          {calView === 'day' && (
            <DayView
              tasks={tasks}
              events={events}
              initialDate={selectedDate ?? undefined}
              onAddEvent={openAddEvent}
            />
          )}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => mainTab === 'list' ? setShowTaskForm(true) : openAddEvent(format(new Date(), 'yyyy-MM-dd'))}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl z-30"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', boxShadow: '0 4px 14px rgba(196,120,138,0.35)' }}
        aria-label={t('tasks.addTask')}
      >
        +
      </motion.button>

      {/* Task form modal */}
      <Modal open={showTaskForm} onClose={() => setShowTaskForm(false)} title={t('tasks.addTask')}>
        <TaskForm onSave={handleSaveTask} onCancel={() => setShowTaskForm(false)} />
      </Modal>

      {/* Quick-add event sheet */}
      {user && (
        <QuickAddSheet
          open={!!sheetDate}
          date={sheetDate ?? format(new Date(), 'yyyy-MM-dd')}
          userId={user.id}
          onClose={() => setSheetDate(null)}
          onSave={handleSaveEvent}
        />
      )}
    </Layout>
  );
}
