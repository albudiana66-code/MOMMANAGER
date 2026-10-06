import { useTranslation, Trans } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AIConsentModalProps {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ open, onAgree, onDecline }: AIConsentModalProps) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onDecline} title={t('ai.consentTitle')}>
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-sm text-[var(--text-primary)]" style={{ lineHeight: 1.6 }}>
          <Trans i18nKey="ai.consentIntro" components={{ strong: <strong /> }} />
        </p>
        <p className="text-sm text-[var(--text-secondary)]" style={{ lineHeight: 1.6 }}>
          <Trans i18nKey="ai.consentDetails" components={{ strong: <strong /> }} />
        </p>
        <p className="text-xs text-[var(--text-muted)]" style={{ lineHeight: 1.5 }}>
          {t('ai.consentFooter')}
        </p>
        <div className="flex gap-3 w-full mt-1">
          <Button variant="secondary" className="flex-1" onClick={onDecline}>
            {t('ai.consentNotNow')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={onAgree}>
            {t('ai.consentAgree')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
