import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Toggle } from '../ui/Toggle';
import { ReminderSelect } from '../ui/ReminderSelect';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useNotificationPermissionGate } from '../../context/NotificationPermissionContext';
import type { CalendarEvent, ReminderMinutes } from '../../types';

interface QuickAddSheetProps {
  open: boolean;
  date: string;
  userId: string;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
}

const DOT_COLORS = ['#C4788A', '#C4B8D8', '#8FA888', '#E8B89A', '#C9A96E', '#6EA8C9'];

export function QuickAddSheet({ open, date, userId, onClose, onSave }: QuickAddSheetProps) {
  const { t } = useTranslation();
  const PLANS = [
    { id: 'mom' as const,    label: t('tasks.planMom'),    emoji: '🌸', color: 'var(--accent)' },
    { id: 'kids' as const,   label: t('tasks.planKids'),   emoji: '🧸', color: 'var(--lavender)' },
    { id: 'family' as const, label: t('tasks.planFamily'), emoji: '🏠', color: 'var(--sage)' },
  ];
  const { settings } = useNotificationSettings();
  const { requestIfNeeded } = useNotificationPermissionGate();
  const [title, setTitle] = useState('');
  const [plan, setPlan] = useState<'mom' | 'kids' | 'family'>('mom');
  const [allDay, setAllDay] = useState(true);
  const [timeHH, setTimeHH] = useState('09');
  const [timeMM, setTimeMM] = useState('00');
  const [color, setColor] = useState(DOT_COLORS[0]);
  const [reminder, setReminder] = useState<ReminderMinutes>(settings.defaultReminderMinutes);

  async function handleSave() {
    if (!title.trim()) return;
    const hasReminder = !allDay && reminder !== null;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: title.trim(),
      date,
      time: allDay ? undefined : `${timeHH}:${timeMM}`,
      allDay,
      plan,
      color,
      reminder_minutes_before: allDay ? null : reminder,
      created_at: new Date().toISOString(),
    };
    if (hasReminder) await requestIfNeeded();
    onSave(event);
    // Reset
    setTitle('');
    setAllDay(true);
    setTimeHH('09');
    setTimeMM('00');
    setColor(DOT_COLORS[0]);
    setReminder(settings.defaultReminderMinutes);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'var(--bg-card)',
              borderRadius: '28px 28px 0 0',
              padding: '0 24px max(calc(env(safe-area-inset-bottom, 0px) + 16px), 56px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </div>

            {/* Title input */}
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.eventTitlePlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              style={{
                width: '100%',
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                marginBottom: 20,
              }}
            />

            {/* Plan selector */}
            <div className="flex gap-2 mb-4">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={plan === p.id
                    ? { background: p.color, color: '#fff', boxShadow: `0 2px 8px ${p.color}55` }
                    : { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                  }
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Date + All day row */}
            <div className="flex items-center justify-between mb-4 py-3" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{t('tasks.date')}</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('tasks.allDay')}</span>
                <Toggle checked={allDay} onChange={() => setAllDay((v) => !v)} />
              </div>
            </div>

            {/* Time picker */}
            {!allDay && (
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('tasks.time')}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="23" value={timeHH}
                    onChange={(e) => setTimeHH(e.target.value.padStart(2, '0'))}
                    className="text-center rounded-xl w-12 py-1.5 text-sm font-semibold"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>:</span>
                  <input
                    type="number" min="0" max="59" value={timeMM}
                    onChange={(e) => setTimeMM(e.target.value.padStart(2, '0'))}
                    className="text-center rounded-xl w-12 py-1.5 text-sm font-semibold"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {/* Reminder */}
            {!allDay && (
              <div className="mb-4">
                <ReminderSelect value={reminder} onChange={setReminder} />
              </div>
            )}

            {/* Color dots */}
            <div className="flex items-center gap-3 mb-5">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('tasks.color')}</span>
              <div className="flex gap-2">
                {DOT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="rounded-full transition-transform active:scale-90"
                    style={{
                      width: 22, height: 22,
                      background: c,
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="w-full py-3.5 rounded-2xl font-semibold text-white mb-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' }}
            >
              {t('tasks.save')}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('tasks.cancel')}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
