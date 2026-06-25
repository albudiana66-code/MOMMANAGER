import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Polyfill crypto.randomUUID for older Android WebViews (API < 92 / Chrome < 92)
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  (crypto as unknown as Record<string, unknown>).randomUUID = function(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
}

// Polyfill globalThis for very old WebViews
if (typeof globalThis === 'undefined') {
  (window as unknown as Record<string, unknown>).globalThis = window;
}

// Native platform setup
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#FAF8F5' });

  // Initialize RevenueCat (required before any IAP calls on iOS)
  if (Capacitor.getPlatform() === 'ios') {
    import('@capgo/capacitor-purchases').then(({ CapacitorPurchases }) => {
      CapacitorPurchases.setup({
        apiKey: 'appl_REPLACE_WITH_YOUR_REVENUECAT_IOS_API_KEY',
      }).catch(console.error);
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Hide splash screen after React renders
SplashScreen.hide();
