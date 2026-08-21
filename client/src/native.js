import { Capacitor } from '@capacitor/core';

/**
 * Native-only setup (status bar and Android back button).
 *
 * Notification permission and FCM device registration are intentionally
 * deferred until a member is signed in, so the permission prompt and token
 * registration happen as one predictable post-login flow.
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

let pushNotificationsInitialized = false;
let fcmSelfTestSent = false;

/**
 * Requests notification permission and registers the signed-in device with
 * Firebase Cloud Messaging. This function is called after sign-in/session
 * restoration so the permission prompt and token registration happen together.
 */
export async function setUpPushNotifications() {
  if (!Capacitor.isNativePlatform() || pushNotificationsInitialized) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      console.warn('[native] push notification permission is not granted');
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'blw_default',
          name: 'BLW Kenya Zone',
          description: 'BLW Kenya Zone announcements and ministry updates',
          importance: 4,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      } catch (error) {
        console.warn('[native] notification channel setup skipped:', error?.message || error);
      }
    }

    const registrationListener = await PushNotifications.addListener('registration', async (token) => {
      console.info('[native] FCM registration callback received');
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
          const detail = await response.text().catch(() => '');
          console.warn('[native] push token registration returned HTTP', response.status, detail);
          return;
        }

        pushNotificationsInitialized = true;
        console.info('[native] FCM token registered with backend');

        if (!fcmSelfTestSent && import.meta.env.VITE_FCM_TEST_MODE === 'true') {
          fcmSelfTestSent = true;
          try {
            const testResponse = await apiFetch('/api/push/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const testDetail = await testResponse.text().catch(() => '');
            if (!testResponse.ok) {
              console.warn('[native] FCM self-test returned HTTP', testResponse.status, testDetail);
            } else {
              console.info('[native] FCM self-test request accepted', testDetail);
            }
          } catch (error) {
            console.warn('[native] FCM self-test request failed:', error?.message || error);
          }
        }
      } catch (error) {
        console.warn('[native] push token registration with backend failed:', error?.message || error);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[native] push registration failed:', error);
    });

    try {
      await PushNotifications.register();
      console.info('[native] FCM registration requested');
    } catch (error) {
      await registrationListener.remove().catch(() => {});
      console.warn('[native] FCM register() failed:', error?.message || error);
    }
  } catch (error) {
    console.warn('[native] push notifications skipped:', error?.message || error);
  }
}
