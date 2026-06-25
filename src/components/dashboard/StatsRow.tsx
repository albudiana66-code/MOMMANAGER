import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';


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
    {
      label: t('dashboard.tasksToday'),
      value: tasksCount,
      emoji: '📅',
      accent: '#C4788A',
    },
    {
      label: t('dashboard.kids'),
      value: kidsCount,
      emoji: '🧸',
      accent: '#E8A87C',
    },
  ];

  return (
    <div className="px-4 mt-3 flex gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 320, damping: 22 }}
          className="flex-1"
          style={{
            height: 72,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.75)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 10,
          }}
        >
          {/* Emoji */}
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>

          {/* Text */}
          <div>
            <div style={{ fontSize: 24, fontWeight: 300, color: '#2D2B2A', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#7A6A62', marginTop: 3, lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              {s.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
