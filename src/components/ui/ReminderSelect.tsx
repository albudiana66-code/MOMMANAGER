import { useTranslation } from 'react-i18next';
import { Select } from './Select';
import type { ReminderMinutes } from '../../types';

interface ReminderSelectProps {
  value: ReminderMinutes;
  onChange: (value: ReminderMinutes) => void;
  label?: string;
}

const VALUES: { value: string; minutes: ReminderMinutes }[] = [
  { value: 'none', minutes: null },
  { value: 'at', minutes: 0 },
  { value: '10', minutes: 10 },
  { value: '30', minutes: 30 },
  { value: '60', minutes: 60 },
  { value: '1440', minutes: 1440 },
];

function toSelectValue(minutes: ReminderMinutes): string {
  return VALUES.find((v) => v.minutes === minutes)?.value ?? 'none';
}

/** The one reminder-offset picker used by the event, task, milestone, and activity forms: none / at time / 10 min / 30 min / 1 hour / 1 day before. */
export function ReminderSelect({ value, onChange, label }: ReminderSelectProps) {
  const { t } = useTranslation();
  const options = [
    { value: 'none', label: t('reminder.none') },
    { value: 'at', label: t('reminder.atTime') },
    { value: '10', label: t('reminder.min10') },
    { value: '30', label: t('reminder.min30') },
    { value: '60', label: t('reminder.hour1') },
    { value: '1440', label: t('reminder.day1') },
  ];

  return (
    <Select
      label={label ?? `🔔 ${t('reminder.label')}`}
      value={toSelectValue(value)}
      options={options}
      onChange={(e) => {
        const found = VALUES.find((v) => v.value === e.target.value);
        onChange(found ? found.minutes : null);
      }}
    />
  );
}
