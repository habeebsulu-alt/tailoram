import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tailoram.app',
  appName: 'Tailoram',
  webDir: 'public',
  server: {
    // Points directly to the live production deployment.
    // Enables continuous instant updates on Android devices whenever Vercel deploys!
    url: 'https://tailoram.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0c0a09',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0c0a09',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
