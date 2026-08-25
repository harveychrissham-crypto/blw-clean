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
let pushNotificationsSetupPromise = null;
let lastRegisteredFcmToken = '';
let foregroundNotificationListenerRegistered = false;

async function savePushToInbox(notification) {
  try {
    const { addNotification } = await import('./utils/notificationStorage');
    addNotification({
      id: notification?.id,
      title: notification?.title,
      body: notification?.body,
      data: notification?.data,
    });
  } catch (error) {
    console.warn('[native] saving notification to inbox skipped:', error?.message || error);
  }
}

async function setUpForegroundNotificationDisplay() {
  if (foregroundNotificationListenerRegistered) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let permission = await LocalNotifications.checkPermissions();

    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions();
    }

    if (permission.display !== 'granted') return;

    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'blw_default',
          name: 'BLW Kenya Zone',
          description: 'BLW Kenya Zone announcements and ministry updates',
          importance: 4,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      } catch (error) {
        console.warn('[native] local notification channel setup skipped:', error?.message || error);
      }
    }

    foregroundNotificationListenerRegistered = true;

    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const title = typeof notification?.title === 'string' && notification.title.trim()
        ? notification.title.trim()
        : 'BLW Kenya Zone';
      const body = typeof notification?.body === 'string' && notification.body.trim()
        ? notification.body.trim()
        : 'You have a new ministry update.';

      await savePushToInbox({ ...notification, title, body });

      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Date.now() % 2147483647),
            title,
            body,
            channelId: 'blw_default',
            schedule: { at: new Date(Date.now() + 100) },
            extra: notification?.data || {},
            smallIcon: 'ic_stat_notify',
            iconColor: '#F2A31C',
            largeIcon: 'ic_notification_large',
          }],
        });
      } catch (error) {
        console.warn('[native] foreground notification display skipped:', error?.message || error);
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', async ({ notification }) => {
      await savePushToInbox(notification);
    });
  } catch (error) {
    console.warn('[native] local notification setup skipped:', error?.message || error);
  }
}

export function setUpPushNotifications() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (pushNotificationsInitialized) return Promise.resolve();
  if (pushNotificationsSetupPromise) return pushNotificationsSetupPromise;

  pushNotificationsSetupPromise = setUpPushNotificationsInternal().finally(() => {
    if (!pushNotificationsInitialized) pushNotificationsSetupPromise = null;
  });

  return pushNotificationsSetupPromise;
}

async function setUpPushNotificationsInternal() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    await setUpForegroundNotificationDisplay();

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
        console.warn('[native] push channel setup skipped:', error?.message || error);
      }
    }

    const registrationListener = await PushNotifications.addListener('registration', async (token) => {
      const tokenValue = typeof token?.value === 'string' ? token.value.trim() : '';
      if (!tokenValue) return;
      if (tokenValue === lastRegisteredFcmToken) return;
      lastRegisteredFcmToken = tokenValue;

      try {
        const { apiFetch } = await import('./config/api');
        const response = await apiFetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenValue, platform: Capacitor.getPlatform() }),
        });

        if (!response.ok) return;

        pushNotificationsInitialized = true;
      } catch {
        // Push registration failures should not break app startup.
      }
    });

    await PushNotifications.addListener('registrationError', () => {
      // Registration errors are intentionally silent in production.
    });

    try {
      await PushNotifications.register();
    } catch {
      await registrationListener.remove().catch(() => {});
    }
  } catch {
    // Push setup is best-effort and must never break app startup.
  }
}
