import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// getDay returns 0=Sun..6=Sat; we want Mon=0..Sun=6
function mondayIndex(date: Date): number {
  return (getDay(date) + 6) % 7;
}

export function CalendarView({ events, onDayClick }: CalendarViewProps) {
  useTranslation();
  const [current, setCurrent] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = mondayIndex(monthStart);

  function hasEvent(date: Date) {
    return events.some((e) => isSameDay(new Date(e.date), date));
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrent((d) => subMonths(d, 1))}
          className="w-8 h-8 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {format(current, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrent((d) => addMonths(d, 1))}
          className="w-8 h-8 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-transform"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-[var(--text-secondary)] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, current);
          const dot = hasEvent(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(format(day, 'yyyy-MM-dd'))}
              className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 text-xs font-medium transition-colors active:scale-95
                ${isToday
                  ? 'bg-[#E91E8C] text-white'
                  : isCurrentMonth
                  ? 'text-[var(--text-primary)] hover:bg-white/5'
                  : 'text-[var(--text-secondary)]'
                }`}
            >
              {format(day, 'd')}
              {dot && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isToday ? 'bg-white' : 'bg-[#E91E8C]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
