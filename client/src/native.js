import { Capacitor } from '@capacitor/core';

/**
 * Native-only setup (status bar and Android back button).
 *
 * Push notifications are intentionally NOT initialized here yet. The Android
 * project does not currently include google-services.json/Firebase
 * configuration, and registering PushNotifications during app startup can
 * cause the native process to terminate before the WebView finishes loading.
 * Once Firebase is configured, push registration can be re-enabled safely.
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  await Promise.allSettled([
    setUpStatusBar(),
    setUpBackButton(),
  ]);
}

async function setUpStatusBar() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0d0c18' });
  } catch (error) {
    console.warn('[native] status bar setup skipped:', error?.message || error);
  }
}

/**
 * Makes the Android hardware back button behave like a browser back button
 * within the app (go back through route history) instead of Capacitor's
 * default of closing the WebView unexpectedly from a nested screen.
 */
async function setUpBackButton() {
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (error) {
    console.warn('[native] back button handling skipped:', error?.message || error);
  }
}

// Push notification setup is intentionally deferred until Firebase is wired.
// Keep the implementation here for when google-services.json is added.
export async function setUpPushNotifications() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('[native] push registration token:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.warn('[native] push registration failed:', error);
    });
  } catch (error) {
    console.warn('[native] push notifications skipped:', error?.message || error);
  }
}
