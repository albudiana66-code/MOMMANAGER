import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, addWeeks, subWeeks,
} from 'date-fns';
import type { Task, CalendarEvent } from '../../types';

interface WeekViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onAddEvent: (date: string) => void;
}

const PLAN_COLORS: Record<string, string> = {
  mom: 'var(--accent)',
  kids: 'var(--lavender)',
  family: 'var(--sage)',
};

export function WeekView({ tasks, events, onDayClick, onAddEvent }: WeekViewProps) {
  const [weekBase, setWeekBase] = useState(new Date());
  const today = new Date();

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekBase, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function itemsForDay(day: Date) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((t) => t.due_date === dateStr);
    const dayEvents = events.filter((e) => e.date === dateStr);
    return [...dayTasks.map((t) => ({ id: t.id, title: t.title, plan: t.plan, color: '' })),
            ...dayEvents.map((e) => ({ id: e.id, title: e.title, plan: e.plan, color: e.color || '' }))];
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setWeekBase((d) => subWeeks(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setWeekBase((d) => addWeeks(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const items = itemsForDay(day);
          const visible = items.slice(0, 3);
          const overflow = items.length - 3;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => { onDayClick(format(day, 'yyyy-MM-dd')); }}
              className="flex flex-col"
              style={{
                borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                minHeight: 100,
              }}
            >
              {/* Day header */}
              <div
                className="flex flex-col items-center py-2 gap-0.5"
                style={{
                  background: isToday ? 'var(--accent-soft)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {format(day, 'EEE')}
                </span>
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 24, height: 24, fontSize: 12, fontWeight: isToday ? 700 : 500,
                    background: isToday ? 'var(--accent)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event pills */}
              <div className="flex flex-col gap-1 p-1">
                {visible.map((item) => (
                  <div
                    key={item.id}
                    className="rounded px-1 py-0.5 truncate"
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      borderLeft: `2px solid ${item.plan ? PLAN_COLORS[item.plan] : 'var(--accent)'}`,
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 4 }}>+{overflow} more</span>
                )}
                {items.length === 0 && (
                  <div
                    className="flex-1 rounded"
                    style={{ margin: 4, minHeight: 40, border: '1px dashed var(--border)' }}
                    onClick={(e) => { e.stopPropagation(); onAddEvent(format(day, 'yyyy-MM-dd')); }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
