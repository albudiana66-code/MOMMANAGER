import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { checkNotificationPermission, ensureNotificationChannel, requestNotificationPermission } from '../lib/notifications';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

interface NotificationPermissionGate {
  /**
   * Shows the friendly in-app explanation screen — then, only if the user
   * taps Allow, the real system permission dialog — the first time this is
   * called while permission hasn't been asked for yet. A no-op every other
   * time (already granted, already denied — we never nag, and on web).
   * Resolves once the user has responded (or immediately if there was
   * nothing to ask).
   */
  requestIfNeeded: () => Promise<void>;
}

const NotificationPermissionContext = createContext<NotificationPermissionGate | null>(null);

/**
 * Mounted once near the app root. This is the ONLY place the native
 * notification permission dialog is triggered from — call sites (saving an
 * item with a reminder, turning on a notification toggle in Settings) ask
 * this gate first instead of requesting permission directly, so the system
 * prompt is never the very first thing a user sees. It's also the only place
 * the "Tips & offers" upgrade-nudge opt-in prompt is shown — once, right
 * after the very first successful permission grant (settings.upgradeNudgesAsked
 * gates it from reappearing).
 */
export function NotificationPermissionProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { settings, saveSettings } = useNotificationSettings();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const resolverRef = useRef<(() => void) | null>(null);

  const requestIfNeeded = useCallback(async () => {
    const status = await checkNotificationPermission();
    if (status !== 'prompt') return;
    await new Promise<void>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, []);

  function resolve() {
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.();
  }

  async function handleAllow() {
    setOpen(false);
    await ensureNotificationChannel();
    const status = await requestNotificationPermission();
    if (status === 'granted' && !settings.upgradeNudgesAsked) {
      setUpgradeOpen(true);
      return; // resolve() happens once the upgrade prompt is answered
    }
    resolve();
  }

  function handleNotNow() {
    setOpen(false);
    resolve();
  }

  async function handleUpgradeYes() {
    setUpgradeOpen(false);
    await saveSettings({ ...settings, upgradeNudges: true, upgradeNudgesAsked: true });
    resolve();
  }

  async function handleUpgradeNo() {
    setUpgradeOpen(false);
    await saveSettings({ ...settings, upgradeNudgesAsked: true });
    resolve();
  }

  return (
    <NotificationPermissionContext.Provider value={{ requestIfNeeded }}>
      {children}
      <Modal open={open} onClose={handleNotNow} title={t('notifications.permissionTitle')}>
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 32, textAlign: 'center' }}>🔔</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
            {t('notifications.permissionBody')}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleNotNow}>{t('notifications.notNow')}</Button>
            <Button className="flex-1" onClick={handleAllow}>{t('notifications.allow')}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={upgradeOpen} onClose={handleUpgradeNo} title={t('notifications.upgradeOptInTitle')}>
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 32, textAlign: 'center' }}>✨</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
            {t('notifications.upgradeOptInBody')}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleUpgradeNo}>{t('notifications.upgradeOptInNo')}</Button>
            <Button className="flex-1" onClick={handleUpgradeYes}>{t('notifications.upgradeOptInYes')}</Button>
          </div>
        </div>
      </Modal>
    </NotificationPermissionContext.Provider>
  );
}

export function useNotificationPermissionGate(): NotificationPermissionGate {
  const ctx = useContext(NotificationPermissionContext);
  if (!ctx) throw new Error('useNotificationPermissionGate must be used within NotificationPermissionProvider');
  return ctx;
}
