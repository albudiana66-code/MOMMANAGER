import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, addDays,
  format, getDay, isSameDay, isSameMonth,
  addMonths, subMonths,
} from 'date-fns';
import type { Task, CalendarEvent } from '../../types';
import { useDateFnsLocale } from '../../hooks/useDateFnsLocale';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks?: Task[];
  onDayClick: (date: string) => void;
  selectedDate?: string | null;
}

function mondayIndex(date: Date): number {
  return (getDay(date) + 6) % 7;
}

const PLAN_DOT: Record<string, string> = {
  mom: 'var(--accent)',
  kids: 'var(--lavender)',
  family: 'var(--sage)',
};

export function CalendarView({ events, tasks = [], onDayClick, selectedDate }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date());
  const today = new Date();
  const dateLocale = useDateFnsLocale();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = mondayIndex(monthStart);
  const dayHeaders = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'EEEEE', { locale: dateLocale }));
  }, [dateLocale]);

  function dotsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const evPlans = events.filter((e) => e.date === dateStr).map((e) => e.plan || 'mom');
    const taskPlans = tasks.filter((t) => t.due_date === dateStr).map((t) => t.plan || 'mom');
    // Unique plans, max 3 dots
    return [...new Set([...evPlans, ...taskPlans])].slice(0, 3);
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrent((d) => subMonths(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {format(current, 'MMMM yyyy', { locale: dateLocale })}
        </span>
        <button
          onClick={() => setCurrent((d) => addMonths(d, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center py-1" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b-${i}`} />)}

        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, current);
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateStr;
          const dots = dotsForDay(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(dateStr)}
              className="relative flex flex-col items-center justify-center rounded-xl py-1 active:scale-95 transition-transform"
              style={{
                background: isToday
                  ? 'var(--accent)'
                  : isSelected
                  ? 'var(--accent-soft)'
                  : 'transparent',
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: isToday ? 700 : 400,
                color: isToday
                  ? '#fff'
                  : isSelected
                  ? 'var(--accent)'
                  : isCurrentMonth
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                lineHeight: '24px',
              }}>
                {format(day, 'd')}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5" style={{ height: 4 }}>
                  {dots.map((plan, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: isToday ? 'rgba(255,255,255,0.7)' : PLAN_DOT[plan],
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
