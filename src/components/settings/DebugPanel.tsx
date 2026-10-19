import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { isNativeMobile } from '../../lib/iap';
import { fetchOfferingsDebugInfo, type OfferingDebugEntry } from '../../lib/iap';
import { checkNotificationPermission, getPendingNotificationCount, type NotificationPermission } from '../../lib/notifications';

const ROW_STYLE = { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, fontFamily: 'monospace' } as const;

/**
 * TestFlight/debug-only diagnostic panel for the two bugs that are hardest
 * to verify without reading a device console: whether RevenueCat is
 * actually returning store-localised prices (vs silently failing and
 * leaving the paywall on a fallback), and whether local notifications are
 * actually permitted/scheduled (vs the OS silently swallowing them).
 * Gated by VITE_SHOW_DEBUG_PANEL so it never ships to the App Store/Play
 * Store build — flip that env var off before a real release.
 */
export function DebugPanel() {
  const [offerings, setOfferings] = useState<OfferingDebugEntry[] | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumping this re-runs the fetch effect below — the Refresh button's only
  // job is to increment it, so the actual fetch always lives in the effect
  // body as a direct .then()/.catch()/.finally() chain (never a separately
  // defined async function called from the effect), matching the pattern
  // `useOfferingPricing` uses to avoid a synchronous setState call from
  // within the effect's own call stack.
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchOfferingsDebugInfo()
      .then((entries) => {
        if (cancelled) return;
        setOfferings(entries);
        setOfferingsError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setOfferingsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        Promise.all([checkNotificationPermission(), getPendingNotificationCount()]).then(([perm, pending]) => {
          if (cancelled) return;
          setPermission(perm);
          setPendingCount(pending);
          setLoading(false);
        });
      });

    return () => { cancelled = true; };
  }, [refreshToken]);

  if (!isNativeMobile()) return null;

  return (
    <div
      className="rounded-3xl p-4"
      style={{ border: '1px dashed #B23B3B', background: 'rgba(220,80,80,0.04)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#B23B3B' }}>
          Debug — TestFlight only
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setLoading(true); setRefreshToken((n) => n + 1); }}
          disabled={loading}
        >
          {loading ? '…' : 'Refresh'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>RevenueCat offerings</p>
          {offeringsError && <p style={{ fontSize: 11, color: '#B23B3B' }}>{offeringsError}</p>}
          {!offeringsError && offerings?.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No packages returned.</p>
          )}
          {offerings?.map((o) => (
            <div key={o.packageIdentifier} style={ROW_STYLE}>
              <span>{o.productIdentifier}</span>
              <span>{o.priceString} ({o.currencyCode})</span>
            </div>
          ))}
        </div>

        <div style={ROW_STYLE}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Notification permission</span>
          <span>{permission ?? '…'}</span>
        </div>

        <div style={ROW_STYLE}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Pending notifications</span>
          <span>{pendingCount ?? '…'}</span>
        </div>
      </div>
    </div>
  );
}
