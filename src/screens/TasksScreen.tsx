import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { CalendarView } from '../components/tasks/CalendarView';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import type { Task, CalendarEvent } from '../types';

type Tab = 'list' | 'calendar';

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

export function TasksScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!user) return;
    setTasks(loadTasks(user.id));
    setEvents(loadEvents(user.id));
  }, [user]);

  function handleSave(partial: Partial<Task>) {
    if (!user) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      user_id: user.id,
      title: partial.title!,
      description: partial.description,
      due_date: partial.due_date,
      completed: false,
      category: partial.category ?? 'personal',
      priority: partial.priority ?? 'medium',
      created_at: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasks(user.id, updated);
    setShowForm(false);
  }

  function handleToggle(id: string) {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    if (user) saveTasks(user.id, updated);
  }

  function handleDelete(id: string) {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (user) saveTasks(user.id, updated);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const dayTasks = selectedDate ? tasks.filter((t) => t.due_date === selectedDate) : [];
  const dayEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : [];

  return (
    <Layout>
      <Header title={t('tasks.title')} />

      {/* Tab bar */}
      <div className="flex mx-4 mt-3 bg-[var(--bg-card)] rounded-2xl p-1 gap-1">
        {(['list', 'calendar'] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === tb ? 'bg-[#E91E8C] text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {tb === 'list' ? t('tasks.title') : t('tasks.calendar')}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <>
          {/* Filter pills */}
          <div className="flex gap-2 px-4 mt-3">
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-[#E91E8C] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                {t(`tasks.${f}`)}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="px-4 mt-3 pb-28">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-[var(--text-secondary)] text-sm">{t('tasks.noTasks')}</p>
              </div>
            ) : (
              filtered.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="px-4 mt-3 pb-28">
          <CalendarView
            events={events}
            onDayClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
          />
          {selectedDate && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d')}
              </p>
              {dayTasks.length === 0 && dayEvents.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  {t('tasks.noEventsToday')}
                </p>
              ) : (
                <>
                  {dayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-[var(--bg-card)] rounded-2xl p-3 mb-2 flex items-center gap-3"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#E91E8C' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] font-medium">{ev.title}</p>
                        {ev.time && (
                          <p className="text-xs text-[var(--text-secondary)]">{ev.time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[#E91E8C] shadow-lg shadow-pink-500/30 flex items-center justify-center text-white text-2xl z-30 active:scale-95 transition-transform"
        aria-label={t('tasks.addTask')}
      >
        +
      </button>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('tasks.addTask')}>
        <TaskForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      </Modal>
    </Layout>
  );
}
