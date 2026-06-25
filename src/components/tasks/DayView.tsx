import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, subDays, parseISO } from 'date-fns';
import type { Task, CalendarEvent } from '../../types';

interface DayViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  initialDate?: string;
  onAddEvent: (date: string) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06–22

const PLAN_COLORS: Record<string, string> = {
  mom: 'var(--accent)',
  kids: 'var(--lavender)',
  family: 'var(--sage)',
};

function pad(n: number) { return String(n).padStart(2, '0'); }

export function DayView({ tasks, events, initialDate, onAddEvent }: DayViewProps) {
  const [date, setDate] = useState(initialDate ? parseISO(initialDate) : new Date());
  const dateStr = format(date, 'yyyy-MM-dd');

  const dayTasks = tasks.filter((t) => t.due_date === dateStr);
  const dayEvents = events.filter((e) => e.date === dateStr);

  const allDay = [
    ...dayTasks.filter((t) => !t.time),
    ...dayEvents.filter((e) => e.allDay || !e.time),
  ];

  function itemAtHour(hour: number) {
    const hStr = pad(hour);
    const t = dayTasks.find((t) => t.time?.startsWith(hStr));
    const e = dayEvents.find((e) => !e.allDay && e.time?.startsWith(hStr));
    return t || e || null;
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setDate((d) => subDays(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="text-center">
          <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {format(date, 'EEEE')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{format(date, 'MMMM d, yyyy')}</p>
        </div>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
        {/* All-day section */}
        {allDay.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-start px-3 py-2 gap-3">
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, paddingTop: 2, flexShrink: 0 }}>All day</span>
              <div className="flex flex-col gap-1 flex-1">
                {allDay.map((item) => {
                  const plan = (item as Task).plan || (item as CalendarEvent).plan;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg px-2 py-1.5"
                      style={{
                        borderLeft: `3px solid ${plan ? PLAN_COLORS[plan] : 'var(--accent)'}`,
                        background: 'var(--bg-primary)',
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {item.title}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Hourly slots */}
        {HOURS.map((hour, i) => {
          const item = itemAtHour(hour);
          const plan = item ? ((item as Task).plan || (item as CalendarEvent).plan) : undefined;

          return (
            <motion.div
              key={hour}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.015 }}
              className="flex items-start px-3 py-1.5 gap-3"
              style={{ borderBottom: hour < 22 ? '1px solid var(--border)' : 'none', minHeight: 44 }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, paddingTop: 2, flexShrink: 0 }}>
                {pad(hour)}:00
              </span>
              <div className="flex-1">
                {item ? (
                  <div
                    className="rounded-lg px-2 py-1.5"
                    style={{
                      borderLeft: `3px solid ${plan ? PLAN_COLORS[plan] : 'var(--accent)'}`,
                      background: plan ? `${PLAN_COLORS[plan]}18` : 'var(--accent-soft)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{item.title}</span>
                    {(item as CalendarEvent).time && (
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 6 }}>
                        {(item as CalendarEvent).time}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onAddEvent(dateStr)}
                    className="w-full text-left"
                    style={{ minHeight: 24 }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add event button */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => onAddEvent(dateStr)}
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          + Add event for {format(date, 'MMM d')}
        </button>
      </div>
    </div>
  );
}
