import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useNotificationPermissionGate } from '../../context/NotificationPermissionContext';
import { checkNotificationPermission, scheduleTestNotification, type NotificationPermission } from '../../lib/notifications';
import { isNativeIOS, isNativeMobile } from '../../lib/iap';
import type { NotificationSettings } from '../../types';

type CategoryKey = keyof NotificationSettings['categories'];

export function NotificationSettingsCard() {
  const { t } = useTranslation();
  const { settings, saveSettings } = useNotificationSettings();
  const { requestIfNeeded } = useNotificationPermissionGate();
  const [permission, setPermission] = useState<NotificationPermission>('unsupported');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    checkNotificationPermission().then(setPermission);
    function onVisible() {
      if (document.visibilityState === 'visible') checkNotificationPermission().then(setPermission);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function setEnabled(enabled: boolean) {
    if (enabled) await requestIfNeeded();
    await saveSettings({ ...settings, enabled });
    checkNotificationPermission().then(setPermission);
  }

  async function setCategory(key: CategoryKey, value: boolean) {
    if (value) await requestIfNeeded();
    await saveSettings({ ...settings, categories: { ...settings.categories, [key]: value } });
    checkNotificationPermission().then(setPermission);
  }

  function setDefaultMinutes(value: string) {
    saveSettings({ ...settings, defaultReminderMinutes: Number(value) as NotificationSettings['defaultReminderMinutes'] });
  }

  function setKitchenTime(value: string) {
    saveSettings({ ...settings, kitchenReminderTime: value });
  }

  function setSelfcareTime(value: string) {
    saveSettings({ ...settings, selfcareReminderTime: value });
  }

  function setQuietHoursEnabled(value: boolean) {
    saveSettings({ ...settings, quietHours: { ...settings.quietHours, enabled: value } });
  }

  function setQuietHoursStart(value: string) {
    saveSettings({ ...settings, quietHours: { ...settings.quietHours, start: value } });
  }

  function setQuietHoursEnd(value: string) {
    saveSettings({ ...settings, quietHours: { ...settings.quietHours, end: value } });
  }

  async function openSystemSettings() {
    await NativeSettings.open({ optionAndroid: AndroidSettings.AppNotification, optionIOS: IOSSettings.AppNotification });
  }

  async function sendTest() {
    await requestIfNeeded();
    await scheduleTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  }

  if (!isNativeMobile()) return null;

  const CATEGORY_ROWS: { key: CategoryKey; label: string }[] = [
    { key: 'calendar', label: t('settings.notifCategoryCalendar') },
    { key: 'tasks', label: t('settings.notifCategoryTasks') },
    { key: 'kids', label: t('settings.notifCategoryKids') },
    { key: 'meals', label: t('settings.notifCategoryMeals') },
    { key: 'selfcare', label: t('settings.notifCategorySelfcare') },
  ];

  const defaultMinutesOptions = [
    { value: '10', label: t('reminder.min10') },
    { value: '30', label: t('reminder.min30') },
    { value: '60', label: t('reminder.hour1') },
    { value: '1440', label: t('reminder.day1') },
  ];

  return (
    <Card>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.notifications')}</h3>

      {permission === 'denied' && (
        <div
          className="flex items-center justify-between gap-3 mb-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.3)' }}
        >
          <span style={{ fontSize: 12, color: '#B23B3B' }}>{t('settings.notificationsOff')}</span>
          <button
            onClick={openSystemSettings}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: '#B23B3B', color: '#fff' }}
          >
            {isNativeIOS() ? t('settings.openIOSSettings') : t('settings.openAndroidSettings')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--text-primary)]">{t('settings.notifMasterSwitch')}</span>
        <Toggle checked={settings.enabled} onChange={setEnabled} />
      </div>

      {settings.enabled && (
        <div className="flex flex-col gap-3">
          {CATEGORY_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between pl-2">
              <span className="text-sm text-[var(--text-secondary)]">{row.label}</span>
              <Toggle checked={settings.categories[row.key]} onChange={(v) => setCategory(row.key, v)} />
            </div>
          ))}

          <div className="mt-1">
            <Select
              label={t('settings.notifDefaultReminder')}
              value={String(settings.defaultReminderMinutes)}
              options={defaultMinutesOptions}
              onChange={(e) => setDefaultMinutes(e.target.value)}
            />
          </div>

          {settings.categories.meals && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">{t('settings.notifKitchenTime')}</label>
              <input
                type="time"
                value={settings.kitchenReminderTime}
                onChange={(e) => setKitchenTime(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm w-full"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {settings.categories.selfcare && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">{t('settings.notifSelfcareTime')}</label>
              <input
                type="time"
                value={settings.selfcareReminderTime}
                onChange={(e) => setSelfcareTime(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm w-full"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mt-2 mb-2">
              <span className="text-sm text-[var(--text-primary)]">{t('settings.notifQuietHours')}</span>
              <Toggle checked={settings.quietHours.enabled} onChange={setQuietHoursEnabled} />
            </div>
            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-3 pl-2">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t('settings.notifQuietHoursStart')}</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="rounded-xl px-3 py-2 text-sm w-full"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">{t('settings.notifQuietHoursEnd')}</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="rounded-xl px-3 py-2 text-sm w-full"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={sendTest} className="mt-1">
            {testSent ? t('settings.notifTestSent') : t('settings.notifSendTest')}
          </Button>
        </div>
      )}
    </Card>
  );
}
