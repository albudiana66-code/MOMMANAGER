import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export function GreetingCard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const hour = new Date().getHours();

  let greeting = t('dashboard.goodMorning');
  if (hour >= 12 && hour < 18) greeting = t('dashboard.goodAfternoon');
  else if (hour >= 18) greeting = t('dashboard.goodEvening');

  const name = profile?.name?.split(' ')[0] || '';

  return (
    <div className="px-5 pt-4">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        {greeting}{name ? `, ${name}` : ''} 👋
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
        {format(new Date(), 'EEEE, MMMM d')}
      </p>
    </div>
  );
}
