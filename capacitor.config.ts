import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soldoutdigital.mommanager',
  appName: 'MomManager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f0f1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f0f1a',
      overlaysWebView: false,
    },
    Browser: {
      androidStrategy: 'custom-tabs',
    },
    LocalNotifications: {
      // Drawable name (no extension) in android/app/src/main/res/drawable —
      // must be a white-on-transparent monochrome shape per Android status
      // bar icon guidelines.
      smallIcon: 'ic_stat_mommanager',
      iconColor: '#C4788A',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
