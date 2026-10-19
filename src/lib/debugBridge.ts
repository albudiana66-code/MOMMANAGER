import { App as CapacitorApp } from '@capacitor/app';
import { isNativeMobile, fetchOfferingsDebugInfo } from './iap';
import { scheduleTestNotification, syncNotifications, getPendingNotificationCount, requestNotificationPermission } from './notifications';
import { DEFAULT_NOTIFICATION_SETTINGS, type CalendarEvent } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// CLI-drivable test hooks for the paywall/Settings/notifications verification
// pass — lets a build be exercised end-to-end (navigate, create a test event,
// trigger a test notification, dump RevenueCat offerings) via
// `xcrun simctl openurl` deep links, with no UI taps. Only wired up when
// VITE_SHOW_DEBUG_PANEL=true (the same flag gating the Settings debug panel),
// so this never ships in a real App Store/Play Store build.
//
// Commands (all under the app's existing custom URL scheme):
//   com.soldoutdigital.mommanager://debug?action=nav&path=/paywall
//   com.soldoutdigital.mommanager://debug?action=testNotification
//   com.soldoutdigital.mommanager://debug?action=createEvent&minutes=10
//   com.soldoutdigital.mommanager://debug?action=clearEvents
//   com.soldoutdigital.mommanager://debug?action=logOfferings
//   com.soldoutdigital.mommanager://debug?action=logPending
// ─────────────────────────────────────────────────────────────────────────────

const DEBUG_URL_HOST = 'com.soldoutdigital.mommanager://debug';

// Matches AuthContext's DEV_USER.id under VITE_DEV_BYPASS=true — the only
// way this bridge is ever exercised (a real signed-in user id is never known
// to a URL scheme trigger fired from outside the app).
const DEBUG_USER_ID = 'dev-user-001';

let navigateHandler: ((path: string) => void) | null = null;
let pendingNav: string | null = null;

function deliverNav(path: string): void {
  if (navigateHandler) navigateHandler(path);
  else pendingNav = path;
}

/** Mount once near the app root, inside the Router — mirrors useNotificationDeepLinkRouter. */
export function registerDebugNavigate(handler: (path: string) => void): () => void {
  navigateHandler = handler;
  if (pendingNav) {
    const path = pendingNav;
    pendingNav = null;
    handler(path);
  }
  return () => {
    if (navigateHandler === handler) navigateHandler = null;
  };
}

function readEvents(): CalendarEvent[] {
  try {
    return JSON.parse(localStorage.getItem(`mm_events_${DEBUG_USER_ID}`) || '[]') as CalendarEvent[];
  } catch {
    return [];
  }
}

function writeEvents(events: CalendarEvent[]): void {
  localStorage.setItem(`mm_events_${DEBUG_USER_ID}`, JSON.stringify(events));
}

function toDateTimeParts(d: Date): { date: string; time: string } {
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

const DEBUG_OVERLAY_ID = 'mm-debug-overlay';

/**
 * Appends a line to a fixed-position overlay pinned to the top of the
 * viewport, outside any scrollable container — so a screenshot taken at any
 * scroll position still shows every debug-action result. console.log isn't
 * readable from outside the WKWebView process in this QA setup, so this is
 * the only channel a screenshot-driven verification pass can actually read.
 */
function showDebugToast(text: string): void {
  let el = document.getElementById(DEBUG_OVERLAY_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = DEBUG_OVERLAY_ID;
    el.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:999999',
      'background:rgba(20,20,20,0.92)', 'color:#0f0', 'font-family:monospace',
      'font-size:13px', 'line-height:1.5', 'padding:8px 10px',
      'max-height:45vh', 'overflow:hidden', 'white-space:pre-wrap',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = `${el.textContent ?? ''}${text}\n`;
}

/** Shared by both the runtime `…://debug` URL handler and the build-time VITE_QA_BOOT_ACTION runner. */
export async function runDebugAction(action: string | null, params: URLSearchParams): Promise<void> {
  console.log('[DebugBridge] action:', action, Object.fromEntries(params));

  switch (action) {
    case 'requestPermission': {
      const status = await requestNotificationPermission();
      console.log('[DebugBridge] requestPermission — result:', status);
      showDebugToast(`requestPermission -> ${status}`);
      break;
    }
    case 'nav': {
      deliverNav(params.get('path') || '/');
      break;
    }
    case 'testNotification': {
      await scheduleTestNotification();
      showDebugToast('testNotification -> scheduled (fires in 5s)');
      break;
    }
    case 'createEvent': {
      const minutes = Number(params.get('minutes') ?? '10');
      const at = new Date(Date.now() + minutes * 60_000);
      const { date, time } = toDateTimeParts(at);
      const events = readEvents();
      const id = `debug-evt-${Date.now()}`;
      events.push({
        id,
        user_id: DEBUG_USER_ID,
        title: `Debug event +${minutes}m`,
        date,
        time,
        allDay: false,
        created_at: new Date().toISOString(),
      });
      writeEvents(events);
      await syncNotifications(DEBUG_USER_ID, DEFAULT_NOTIFICATION_SETTINGS);
      const count = await getPendingNotificationCount();
      console.log(`[DebugBridge] createEvent +${minutes}min (id=${id}, at=${date} ${time}) — pending notifications after sync:`, count);
      showDebugToast(`createEvent +${minutes}min @ ${time} -> pending=${count}`);
      break;
    }
    case 'clearEvents': {
      writeEvents([]);
      await syncNotifications(DEBUG_USER_ID, DEFAULT_NOTIFICATION_SETTINGS);
      const count = await getPendingNotificationCount();
      console.log('[DebugBridge] clearEvents — pending notifications after sync:', count);
      showDebugToast(`clearEvents -> pending=${count}`);
      break;
    }
    case 'logOfferings': {
      const entries = await fetchOfferingsDebugInfo();
      showDebugToast(`offerings -> ${entries.length === 0 ? 'NONE' : entries.map((e) => `${e.productIdentifier}: ${e.priceString} (${e.currencyCode})`).join(' | ')}`);
      break;
    }
    case 'logPending': {
      const count = await getPendingNotificationCount();
      console.log('[DebugBridge] pending notifications:', count);
      showDebugToast(`pending=${count}`);
      break;
    }
    default:
      console.error('[DebugBridge] unknown action:', action);
  }
}

async function handleDebugUrl(url: string): Promise<void> {
  const query = url.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  await runDebugAction(params.get('action'), params);
}

/** Call once at app startup, alongside initNotificationTapHandling(). No-op unless native + VITE_SHOW_DEBUG_PANEL=true. */
export function initDebugBridge(): void {
  if (!isNativeMobile() || import.meta.env.VITE_SHOW_DEBUG_PANEL !== 'true') return;
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(DEBUG_URL_HOST)) return;
    handleDebugUrl(url).catch((err) => console.error('[DebugBridge] error handling', url, err));
  });
}
