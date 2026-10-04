/**
 * Tailoram - Capacitor Native Android Configuration
 * Package Name: com.tailoram.app
 *
 * To build the native Android project:
 * 1. npm install @capacitor/core @capacitor/cli @capacitor/android
 * 2. npx cap add android
 * 3. npx cap open android
 */

export interface CapacitorServerConfig {
  url?: string;
  cleartext?: boolean;
  androidScheme?: string;
}

export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: CapacitorServerConfig;
  android?: {
    backgroundColor?: string;
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
  };
  plugins?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'com.tailoram.app',
  appName: 'Tailoram',
  webDir: 'out',
  server: {
    // Points directly to the live production deployment.
    // Enables continuous instant updates on Android devices whenever Vercel deploys!
    url: 'https://tailoram.vercel.app',
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
