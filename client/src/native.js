import { Capacitor } from '@capacitor/core';

function fcmDebug(message, detail = '') {
  try {
    const existing = document.getElementById('blw-fcm-debug');
    const panel = existing || (() => {
      const el = document.createElement('pre');
      el.id = 'blw-fcm-debug';
      Object.assign(el.style, {
        position: 'fixed',
        left: '10px',
        right: '10px',
        bottom: '10px',
        zIndex: '2147483647',
        maxHeight: '42vh',
        overflow: 'auto',
        margin: '0',
        padding: '12px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,.92)',
        color: '#fff',
        font: '12px/1.45 monospace',
        whiteSpace: 'pre-wrap',
        boxShadow: '0 8px 30px rgba(0,0,0,.45)',
      });
      document.body.appendChild(el);
      return el;
    })();
    const line = `[${new Date().toLocaleTimeString()}] ${message}${detail ? `: ${detail}` : ''}`;
    panel.textContent = `${panel.textContent ? `${panel.textContent}\n` : ''}${line}`;
    panel.scrollTop = panel.scrollHeight;
  } catch {
    // Diagnostics must never break the app.
  }
}

/**
 * Native-only setup (status bar and Android back button).
 *
 * Notification permission and FCM device registration are intentionally
 * deferred until a member is signed in, so the permission prompt and token
 * registration happen as one predictable post-login flow.
 */
export async function initNative() {
  fcmDebug('initNative called', `${Capacitor.getPlatform()} / native=${Capacitor.isNativePlatform()}`);
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

export async function setUpPushNotifications() {
  fcmDebug('setUpPushNotifications called');
  if (!Capacitor.isNativePlatform()) {
    fcmDebug('STOP', 'not a native platform');
    return;
  }
  if (pushNotificationsInitialized) {
    fcmDebug('STOP', 'already initialized');
    return;
  }

  try {
    fcmDebug('loading PushNotifications plugin');
    const { PushNotifications } = await import('@capacitor/push-notifications');
    fcmDebug('PushNotifications plugin loaded');

    let permission = await PushNotifications.checkPermissions();
    fcmDebug('permission check', permission?.receive || 'unknown');
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
      fcmDebug('permission request result', permission?.receive || 'unknown');
    }
    if (permission.receive !== 'granted') {
      fcmDebug('STOP', 'notification permission not granted');
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
        fcmDebug('notification channel ready');
      } catch (error) {
        fcmDebug('channel setup failed', error?.message || String(error));
      }
    }

    const registrationListener = await PushNotifications.addListener('registration', async (token) => {
      fcmDebug('FCM registration callback received', token?.value ? 'token received' : 'empty token');
      try {
        const { apiFetch } = await import('./config/api');
        fcmDebug('posting token to backend');
        const response = await apiFetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
        fcmDebug('/api/push/register response', String(response.status));

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          fcmDebug('token registration failed', `${response.status} ${detail}`);
          return;
        }

        pushNotificationsInitialized = true;
        fcmDebug('FCM token registered with backend');

        if (!fcmSelfTestSent && import.meta.env.VITE_FCM_TEST_MODE === 'true') {
          fcmSelfTestSent = true;
          try {
            const testResponse = await apiFetch('/api/push/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const testDetail = await testResponse.text().catch(() => '');
            fcmDebug('/api/push/test response', `${testResponse.status} ${testDetail}`);
          } catch (error) {
            fcmDebug('FCM self-test request failed', error?.message || String(error));
          }
        }
      } catch (error) {
        fcmDebug('backend registration exception', error?.message || String(error));
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      fcmDebug('FCM registrationError', JSON.stringify(error));
    });

    fcmDebug('calling PushNotifications.register()');
    try {
      await PushNotifications.register();
      fcmDebug('PushNotifications.register() resolved');
    } catch (error) {
      await registrationListener.remove().catch(() => {});
      fcmDebug('PushNotifications.register() threw', error?.message || String(error));
    }
  } catch (error) {
    fcmDebug('push setup exception', error?.message || String(error));
  }
}
