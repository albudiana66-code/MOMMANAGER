import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ReminderSelect } from '../ui/ReminderSelect';
import { useNotificationPermissionGate } from '../../context/NotificationPermissionContext';
import type { ReminderMinutes, Task } from '../../types';

interface TaskFormProps {
  onSave: (task: Partial<Task>) => void;
  onCancel: () => void;
  initial?: Partial<Task>;
}

export function TaskForm({ onSave, onCancel, initial }: TaskFormProps) {
  const { t } = useTranslation();
  const { requestIfNeeded } = useNotificationPermissionGate();

  const PLANS = [
    { id: 'mom' as const,    label: `🌸 ${t('tasks.planMom')}`,    color: 'var(--accent)' },
    { id: 'kids' as const,   label: `🧸 ${t('tasks.planKids')}`,   color: 'var(--lavender)' },
    { id: 'family' as const, label: `🏠 ${t('tasks.planFamily')}`, color: 'var(--sage)' },
  ];

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority ?? 'medium');
  const [category, setCategory] = useState<Task['category']>(initial?.category ?? 'personal');
  const [plan, setPlan] = useState<Task['plan']>(initial?.plan ?? 'mom');
  const [reminder, setReminder] = useState<ReminderMinutes>(
    initial?.reminder_minutes_before !== undefined ? initial.reminder_minutes_before : (initial?.has_reminder ? 0 : null)
  );
  const [error, setError] = useState('');

  const priorityOptions = [
    { value: 'high', label: t('tasks.high') },
    { value: 'medium', label: t('tasks.medium') },
    { value: 'low', label: t('tasks.low') },
  ];

  const categoryOptions = [
    { value: 'work', label: t('tasks.work') },
    { value: 'personal', label: t('tasks.personal') },
    { value: 'kids', label: t('tasks.kidsCategory') },
    { value: 'medical', label: t('tasks.medical') },
    { value: 'other', label: t('tasks.other') },
  ];

  async function handleSubmit() {
    if (!title.trim()) {
      setError(t('common.required'));
      return;
    }
    setError('');
    const hasDateTime = !!dueDate && !!time;
    const hasReminder = hasDateTime && reminder !== null;
    if (hasReminder) await requestIfNeeded();
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      time: time || undefined,
      priority,
      category,
      plan,
      reminder_minutes_before: hasDateTime ? reminder : null,
      has_reminder: hasReminder,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan selector */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('settings.plan')}</p>
        <div className="flex gap-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={plan === p.id
                ? { background: p.color, color: '#fff' }
                : { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={t('tasks.taskTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('tasks.taskTitle')}
        error={error}
      />
      <Textarea
        label={t('tasks.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('tasks.description')}
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('tasks.dueDate')}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Input
          label={t('tasks.timeOptional')}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {/* Reminder */}
      {dueDate && time ? (
        <ReminderSelect value={reminder} onChange={setReminder} />
      ) : (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🔔 {t('tasks.reminderNeedsDateTime')}</p>
      )}

      <Select
        label={t('tasks.priority')}
        value={priority}
        options={priorityOptions}
        onChange={(e) => setPriority(e.target.value as Task['priority'])}
      />
      <Select
        label={t('tasks.category')}
        value={category}
        options={categoryOptions}
        onChange={(e) => setCategory(e.target.value as Task['category'])}
      />
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {t('tasks.cancel')}
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          {t('tasks.save')}
        </Button>
      </div>
    </div>
  );
}
