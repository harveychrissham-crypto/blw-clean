import { Capacitor } from '@capacitor/core';

/**
 * Native-only setup (status bar and Android back button).
 *
 * Notification permission is requested during cold boot so the user sees the
 * system permission prompt when the app opens, before signing in. Device-token
 * registration remains deferred until a member is signed in, because the
 * backend associates each FCM token with the signed-in account.
 *
 * Keep this file in the Android release workflow's client path so merged FCM
 * fixes always produce a fresh APK for device verification.
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  markQrCameraSessions();

  await Promise.allSettled([
    setUpStatusBar(),
    setUpBackButton(),
    requestPushPermissionOnLaunch(),
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

async function requestPushPermissionOnLaunch() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'blw_default',
        name: 'BLW Kenya Zone',
        description: 'BLW Kenya Zone announcements and ministry updates',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    }
  } catch (error) {
    console.warn('[native] launch notification permission skipped:', error?.message || error);
  }
}

// Listener registration is one-time, but token registration can be retried.
let pushListenersInitialized = false;
let pushTokenRegistered = false;
let pushRegistrationInFlight = false;
let fcmSelfTestSent = false;

async function registerCurrentToken(tokenValue) {
  if (!tokenValue || pushRegistrationInFlight) return;
  pushRegistrationInFlight = true;
  try {
    const { apiFetch } = await import('./config/api');
    const response = await apiFetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokenValue,
        platform: Capacitor.getPlatform(),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[native] push token registration returned HTTP', response.status, detail);
      return;
    }

    pushTokenRegistered = true;
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
  } finally {
    pushRegistrationInFlight = false;
  }
}

export async function setUpPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  if (pushTokenRegistered) return;

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

    if (!pushListenersInitialized) {
      await PushNotifications.addListener('registration', async (token) => {
        console.info('[native] FCM registration callback received');
        await registerCurrentToken(token?.value || '');
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.warn('[native] push registration failed:', error);
      });

      pushListenersInitialized = true;
    }

    // Do not treat register() itself as success. Firebase may fail asynchronously,
    // and subsequent sign-in/session restores should be allowed to retry.
    await PushNotifications.register();
    console.info('[native] FCM registration requested');
  } catch (error) {
    console.warn('[native] push notifications skipped:', error?.message || error);
  }
}
