import { defineConfig } from 'vitest/config';

// jsdom is required because src/lib/notifications.ts (and the i18n module it
// imports) touch localStorage/window at import time — the same APIs they use
// for real inside the app's WebView, so tests exercise them for real too
// rather than mocking them away.
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
