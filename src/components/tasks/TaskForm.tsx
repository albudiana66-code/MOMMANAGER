import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Task } from '../../types';

interface TaskFormProps {
  onSave: (task: Partial<Task>) => void;
  onCancel: () => void;
  initial?: Partial<Task>;
}

const PLANS = [
  { id: 'mom' as const,    label: '🌸 Mom',    color: 'var(--accent)' },
  { id: 'kids' as const,   label: '🧸 Kids',   color: 'var(--lavender)' },
  { id: 'family' as const, label: '🏠 Family', color: 'var(--sage)' },
];

export function TaskForm({ onSave, onCancel, initial }: TaskFormProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority ?? 'medium');
  const [category, setCategory] = useState<Task['category']>(initial?.category ?? 'personal');
  const [plan, setPlan] = useState<Task['plan']>(initial?.plan ?? 'mom');
  const [reminder, setReminder] = useState(initial?.has_reminder ?? false);
  const [error, setError] = useState('');

  function toggleReminder() {
    if (!reminder && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setReminder((r) => !r);
  }

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

  function handleSubmit() {
    if (!title.trim()) {
      setError(t('common.required'));
      return;
    }
    setError('');
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      time: time || undefined,
      priority,
      category,
      plan,
      has_reminder: reminder && !!dueDate && !!time,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan selector */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Plan</p>
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
          label="Time (optional)"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {/* Reminder toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 14, border: '1px solid var(--border)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>🔔 Set Reminder</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {reminder && dueDate && time
              ? `Notify at ${time} on ${dueDate}`
              : 'Requires date & time to be set'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleReminder}
          aria-label="Toggle reminder"
          style={{
            width: 48, height: 28, borderRadius: 14, flexShrink: 0, border: 'none',
            background: reminder ? 'var(--accent)' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: reminder ? 23 : 3,
            width: 22, height: 22, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            display: 'block',
          }} />
        </button>
      </div>

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
