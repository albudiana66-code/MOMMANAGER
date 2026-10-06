import { useApp } from '../context/AppContext';
import { getDateFnsLocale } from '../lib/dateLocale';

export function useDateFnsLocale() {
  const { language } = useApp();
  return getDateFnsLocale(language);
}
