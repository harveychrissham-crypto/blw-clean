import { Capacitor } from '@capacitor/core';

/**
 * Native-only setup (status bar and Android back button).
 *
 * Push notifications are wired up (Firebase config lives in
 * android/app/google-services.json) but are deliberately NOT called from
 * initNative(). Requesting permission and registering with FCM during cold
 * boot can delay/kill the native process before the WebView finishes loading,
 * so setUpPushNotifications() is called later instead, once a member is
 * actually signed in (see context/AuthContext.jsx).
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  markQrCameraSessions();

  await Promise.allSettled([
    setUpStatusBar(),
    setUpBackButton(),
  ]);
}

function markQrCameraSessions() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => {
      sessionStorage.setItem('blw_qr_scan_active', '1');
      return original(...args);
    };
  } catch (error) {
    console.warn('[native] camera session marker skipped:', error?.message || error);
  }
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

// Guards against double-registering listeners if setUpPushNotifications()
// is called more than once in a session (e.g. logout then log back in).
let pushNotificationsInitialized = false;

/**
 * Requests push permission, creates the Android notification channel used by
 * the backend, and registers the device with Firebase Cloud Messaging.
 *
 * This is deliberately NOT called from initNative() -- see the comment on
 * that function. AuthContext calls it once a member session is confirmed.
 */
export async function setUpPushNotifications() {
  if (!Capacitor.isNativePlatform() || pushNotificationsInitialized) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    // The server sends Android notifications to this explicit channel.
    // Creating it before registration ensures Android 8+ can display them.
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'blw_default',
        name: 'BLW Kenya Zone',
        description: 'BLW Kenya Zone announcements and ministry updates',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    }

    // Register listeners BEFORE register(). On some Android devices the FCM
    // token can be delivered immediately, so registering first risks missing
    // the token event entirely.
    await PushNotifications.addListener('registration', async (token) => {
      try {
        const { apiFetch } = await import('./config/api');
        const response = await apiFetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform(),
          }),
        });

        if (!response.ok) {
          console.warn('[native] push token registration returned HTTP', response.status);
        }
      } catch (error) {
        console.warn('[native] push token registration with backend failed:', error?.message || error);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[native] push registration failed:', error);
    });

    await PushNotifications.register();
    pushNotificationsInitialized = true;
  } catch (error) {
    console.warn('[native] push notifications skipped:', error?.message || error);
  }
}
