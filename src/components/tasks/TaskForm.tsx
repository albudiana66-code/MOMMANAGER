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

export function TaskForm({ onSave, onCancel, initial }: TaskFormProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority ?? 'medium');
  const [category, setCategory] = useState<Task['category']>(initial?.category ?? 'personal');
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
      priority,
      category,
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
        rows={3}
      />
      <Input
        label={t('tasks.dueDate')}
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
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
