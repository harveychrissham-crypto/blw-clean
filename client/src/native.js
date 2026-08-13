import { Capacitor } from '@capacitor/core';

/**
 * Native-only setup (status bar theming, Android back button, push
 * notifications). Safe to call on web/dev builds — everything here is
 * gated behind Capacitor.isNativePlatform() and wrapped so a missing
 * plugin or unconfigured Firebase project degrades quietly instead of
 * crashing the app.
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  await Promise.allSettled([
    setUpStatusBar(),
    setUpBackButton(),
    setUpPushNotifications(),
  ]);
}

async function setUpStatusBar() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark }); // light text/icons, for our dark theme
    await StatusBar.setBackgroundColor({ color: '#0d0c18' });
  } catch (error) {
    console.warn('[native] status bar setup skipped:', error?.message || error);
  }
}

/**
 * Makes the Android hardware back button behave like a browser back button
 * within the app (go back through route history) instead of Capacitor's
 * default of closing the WebView/app unexpectedly from a nested screen.
 */
async function setUpBackButton() {
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
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

/**
 * Requests permission and registers for push notifications. This only
 * produces a working device token once a Firebase project is wired up
 * (client/android/app/google-services.json — see build.gradle, which
 * already conditionally applies the google-services plugin only if that
 * file exists). Until then this safely no-ops.
 */
async function setUpPushNotifications() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      // TODO: send token.value to the backend once there's an endpoint to
      // store per-member push tokens (e.g. POST /api/members/push-token),
      // so the worker's weekly reminder job (or a "we're live" trigger)
      // can target real devices instead of only sending email.
      console.log('[native] push registration token:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.warn('[native] push registration failed:', error);
    });
  } catch (error) {
    console.warn('[native] push notifications skipped:', error?.message || error);
  }
}
