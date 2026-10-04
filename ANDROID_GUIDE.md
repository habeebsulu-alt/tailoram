# Tailoram Android Mobile App Guide

> **Package Name**: `com.tailoram.app`  
> **Framework**: Capacitor 8 + Next.js 15 App Router  
> **Target OS**: Android 8.0+ (API Level 26–35)  
> **Server Sync**: `https://tailoram.com` (Over-the-Air Live Sync)

---

## 1. Quick Start: How to Open & Test

### Option A: Open Directly in Android Studio
Run the following command in your terminal:
```bash
npm run mobile:android
```
*(Or `npx cap open android`)*. This launches Android Studio with the complete native project (`android/`).

### Option B: Build a Debug APK directly from Command Line
If you have the Android SDK installed:
```bash
cd android
./gradlew assembleDebug
```
The generated `.apk` will be saved to:
`android/app/build/outputs/apk/debug/app-debug.apk`

You can transfer this APK directly to any Android smartphone via USB or WhatsApp and install it.

---

## 2. Architecture & Live Sync Advantage

The Tailoram Android app is powered by **Capacitor 8**:
1. **Live Production Bridge**:
   - `capacitor.config.ts` is configured with `server.url: 'https://tailoram.com'`.
   - **Continuous Over-The-Air Updates**: Every time you commit code and Vercel deploys, users on Android instantly get your new features, bug fixes, and design updates without waiting for Google Play review!
2. **Native Android Features Enabled**:
   - **Camera Access**: Clients & artisans can take photos of fabric, styles, and measurements (`CAMERA` permission in `AndroidManifest.xml`).
   - **Push Notifications**: Android 13+ native notification permissions (`POST_NOTIFICATIONS`).
   - **Deep Linking / App Links**: Opening `https://tailoram.com/*` links on Android automatically launches the native app (`.well-known/assetlinks.json`).
   - **Bottom Navigation**: Ergonomic native bottom navigation bar for comfortable one-handed use on phones.
   - **Adaptive Icons**: Clean luxury gold scissor branding across all Android launcher densities (MDPI to XXXHDPI).

---

## 3. How to Build Release AAB for Google Play Store

When you are ready to publish Tailoram on the Google Play Console:

1. **Generate a Release Keystore** (Run once in terminal):
   ```bash
   keytool -genkey -v -keystore tailoram-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tailoram
   ```
2. **Configure Signing in `android/app/build.gradle`**:
   Add your keystore credentials in the `signingConfigs` block.
3. **Build the Android App Bundle (AAB)**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   The `.aab` file will be generated at:
   `android/app/build/outputs/bundle/release/app-release.aab`
4. **Upload to Google Play Console**:
   Submit `app-release.aab` under **Production** or **Internal Testing** in Google Play Console.

---

## 4. Useful Project Commands

| Command | Action |
|---|---|
| `npm run mobile:android` | Opens native project in Android Studio |
| `npm run mobile:sync` | Synchronizes web assets and plugins to Android |
| `npm run mobile:build` | Builds Next.js and synchronizes to Android |
| `powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1` | Regenerates all high-res Android adaptive icons |
