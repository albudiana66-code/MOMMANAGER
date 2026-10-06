import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import { useDateFnsLocale } from '../../hooks/useDateFnsLocale';
import { isNativeIOS, isNativeMobile } from '../../lib/iap';

interface BilledDisclosureProps {
  /** A real, auto-renewing trial billed through Google Play / App Store / Stripe. */
  variant: 'billed';
  /** Real trial end date once the trial has actually started (e.g. Settings). Null if not started yet. */
  trialEndDate: Date | null;
  /** When trialEndDate is null, show an honest "ends {date} if you start today" estimate instead of nothing. */
  estimateIfStartedToday?: boolean;
  /** Real, store-localised price string — never a hardcoded currency. */
  price: string;
  /** Translated billing period unit, e.g. "month" / "year". */
  period: string;
  className?: string;
}

interface FreeDisclosureProps {
  /** A trial that grants access without any payment method or store subscription attached. */
  variant: 'free';
  trialEndDate: Date | null;
  className?: string;
}

type TrialDisclosureProps = BilledDisclosureProps | FreeDisclosureProps;

const TEXT_STYLE: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--text-primary)',
  margin: 0,
};

const CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  background: 'var(--accent-soft)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
  padding: '12px 14px',
};

/**
 * Mandatory subscription-terms disclosure block for every trial / price
 * surface in the app (Settings, paywall, upsells). Two variants because the
 * app has two genuinely different trial mechanisms:
 *  - "billed": a real Google Play / App Store / Stripe subscription with a
 *    trial offer attached — will actually auto-charge, so the full
 *    Play-mandated 4-line disclosure is accurate here.
 *  - "free": our own no-payment trial (Supabase-only flag, no store
 *    subscription) — it never charges anyone, so stating otherwise would be
 *    false. Uses honest wording instead.
 */
export function TrialDisclosure(props: TrialDisclosureProps) {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();

  if (props.variant === 'free') {
    const dateLabel = props.trialEndDate
      ? format(props.trialEndDate, 'd MMM yyyy', { locale: dateLocale })
      : null;

    return (
      <div className={props.className} style={CONTAINER_STYLE}>
        <p style={TEXT_STYLE}>
          {dateLabel ? t('trialDisclosure.freeEndsOn', { date: dateLabel }) : t('trialDisclosure.freeDuration')}
        </p>
        <p style={TEXT_STYLE}>{t('trialDisclosure.freeNoCharge')}</p>
        <p style={TEXT_STYLE}>{t('trialDisclosure.freeNoAutoRenew')}</p>
      </div>
    );
  }

  const resolvedEndDate = props.trialEndDate ?? (props.estimateIfStartedToday ? addDays(new Date(), 7) : null);
  const dateLabel = resolvedEndDate ? format(resolvedEndDate, 'd MMM yyyy', { locale: dateLocale }) : null;

  const cancelLine = !isNativeMobile()
    ? t('trialDisclosure.cancelWeb')
    : isNativeIOS()
    ? t('trialDisclosure.cancelApple')
    : t('trialDisclosure.cancelGoogle');

  return (
    <div className={props.className} style={CONTAINER_STYLE}>
      {dateLabel && (
        <p style={TEXT_STYLE}>
          {props.trialEndDate
            ? t('trialDisclosure.endsOn', { date: dateLabel })
            : t('trialDisclosure.endsOnIfStartedToday', { date: dateLabel })}
        </p>
      )}
      <p style={TEXT_STYLE}>{t('trialDisclosure.chargedAfter', { price: props.price, period: props.period })}</p>
      <p style={TEXT_STYLE}>{cancelLine}</p>
      <p style={TEXT_STYLE}>{t('trialDisclosure.autoRenews')}</p>
    </div>
  );
}
