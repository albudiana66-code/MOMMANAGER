import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerDebugNavigate, runDebugAction } from '../lib/debugBridge';

/** Mount once near the app root, inside the Router — mirrors useNotificationDeepLinkRouter. Drains any `?action=nav` debug deep link into a real react-router navigation. */
export function useDebugDeepLinkRouter(): void {
  const navigate = useNavigate();
  useEffect(() => {
    return registerDebugNavigate((path) => navigate(path));
  }, [navigate]);
}

/**
 * Build-time counterpart to the runtime `…://debug` deep link — runs a
 * semicolon-separated sequence of debug actions once on cold start, with no
 * URL-scheme trigger and no tap. Needed because `xcrun simctl openurl`
 * surfaces an OS-level "Open in App?" confirmation that only a real touch
 * can dismiss, which a screenshot-only CI/QA pass run through the Simulator
 * has no way to tap.
 *
 * Format: "action1:k=v,k2=v2;action2;action3:k=v" — e.g.
 * "requestPermission;createEvent:minutes=10;nav:path=/settings".
 * No-op unless VITE_QA_BOOT_ACTIONS is set at build time (never set outside
 * a QA build — see VITE_SHOW_DEBUG_PANEL).
 */
export function useQABootSequence(): void {
  const navigate = useNavigate();
  const fired = useRef(false);
  useEffect(() => {
    const raw = import.meta.env.VITE_QA_BOOT_ACTIONS;
    if (!raw || fired.current) return;
    fired.current = true;

    (async () => {
      for (const step of raw.split(';')) {
        const [action, paramsStr] = step.split(':');
        const params = new URLSearchParams(paramsStr ?? '');
        if (action === 'nav') {
          navigate(params.get('path') || '/');
        } else {
          await runDebugAction(action, params);
        }
        // Small gap so each step's console output / state change is
        // distinguishable from the next when read back from the log.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    })();
  }, [navigate]);
}
