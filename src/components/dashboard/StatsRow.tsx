import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { Card } from '../ui/Card';

export function StatsRow() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tasksCount, setTasksCount] = useState(0);
  const [kidsCount, setKidsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      supabase.from('tasks').select('id', { count: 'exact' })
        .eq('user_id', user.id).eq('due_date', today).eq('completed', false),
      supabase.from('kids').select('id', { count: 'exact' })
        .eq('user_id', user.id),
    ]).then(([tasks, kids]) => {
      setTasksCount(tasks.count || 0);
      setKidsCount(kids.count || 0);
    });
  }, [user]);

  const stats = [
    { label: t('dashboard.tasksToday'), value: tasksCount, icon: '✅' },
    { label: t('dashboard.kids'), value: kidsCount, icon: '👶' },
  ];

  return (
    <div className="px-4 mt-3 grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="text-center py-4">
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-tight">{s.label}</div>
        </Card>
      ))}
    </div>
  );
}
