import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/Badge';
import type { Task } from '../../types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityDot: Record<Task['priority'], string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

const categoryColor: Record<Task['category'], string> = {
  work: '#6366f1',
  personal: '#E91E8C',
  kids: '#f59e0b',
  medical: '#ef4444',
  other: '#6b7280',
};

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);

  function handleDelete() {
    setRemoving(true);
  }

  return (
    <AnimatePresence onExitComplete={() => onDelete(task.id)}>
      {!removing && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--bg-card)] rounded-2xl p-4 mb-3 flex items-start gap-3"
        >
          {/* Priority dot */}
          <div className="mt-1 flex-shrink-0">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: priorityDot[task.priority] }}
              aria-label={t(`tasks.${task.priority}`)}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium leading-snug ${
                task.completed
                  ? 'line-through text-[var(--text-secondary)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {task.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge color={categoryColor[task.category]}>
                {t(`tasks.${task.category === 'kids' ? 'kidsCategory' : task.category}`)}
              </Badge>
              {task.due_date && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {format(parseISO(task.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onToggle(task.id)}
              aria-label={t('tasks.markComplete')}
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.completed
                  ? 'bg-[#E91E8C] border-[#E91E8C] text-white'
                  : 'border-white/20 text-transparent'
              }`}
            >
              {task.completed && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={handleDelete}
              aria-label={t('tasks.delete')}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5m1.75 0l-.583 7.583a.583.583 0 01-.584.584H4.667a.583.583 0 01-.583-.584L3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
