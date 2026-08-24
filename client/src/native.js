import { Capacitor } from '@capacitor/core';

const PUSH_PERMISSION_PROMPT_EVENT = 'blw:push-permission-prompt';
const PUSH_PERMISSION_DENIED_EVENT = 'blw:push-permission-denied';

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
    console.log('[native] local notification permission:', permission?.display);

    if (permission.display !== 'granted') {
      console.log('[native] requesting local notification permission');
      permission = await LocalNotifications.requestPermissions();
      console.log('[native] local notification permission result:', permission?.display);
    }

    if (permission.display !== 'granted') {
      console.warn('[native] local notification permission not granted:', permission?.display);
      return;
    }

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
    console.warn('[native] local notification setup failed:', error?.message || error);
  }
}

export async function requestPushNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return 'granted';

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permission = await PushNotifications.checkPermissions();
    console.log('[native] explicit push permission check:', permission?.receive);

    if (permission.receive === 'granted') return 'granted';

    permission = await PushNotifications.requestPermissions();
    console.log('[native] explicit push permission result:', permission?.receive);
    return permission?.receive || 'denied';
  } catch (error) {
    console.warn('[native] explicit push permission request failed:', error?.message || error);
    return 'denied';
  }
}

export function setUpPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[native] push setup skipped: web platform');
    return Promise.resolve();
  }
  if (pushNotificationsInitialized) {
    console.log('[native] push setup skipped: already initialized');
    return Promise.resolve();
  }
  if (pushNotificationsSetupPromise) {
    console.log('[native] push setup joined existing attempt');
    return pushNotificationsSetupPromise;
  }

  console.log('[native] starting post-login push setup');
  pushNotificationsSetupPromise = setUpPushNotificationsInternal().finally(() => {
    if (!pushNotificationsInitialized) pushNotificationsSetupPromise = null;
  });

  return pushNotificationsSetupPromise;
}

async function setUpPushNotificationsInternal() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.checkPermissions();
    console.log('[native] push permission before request:', permission?.receive);

    if (permission.receive !== 'granted') {
      if (permission.receive === 'prompt') {
        console.log('[native] showing in-app notification permission explanation');
        setTimeout(() => window.dispatchEvent(new Event(PUSH_PERMISSION_PROMPT_EVENT)), 0);
      } else {
        console.warn('[native] push permission already denied; showing settings guidance');
        setTimeout(() => window.dispatchEvent(new Event(PUSH_PERMISSION_DENIED_EVENT)), 0);
      }
      return;
    }

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
      console.log('[native] FCM registration event received:', tokenValue ? 'token received' : 'empty token');
      if (!tokenValue) return;
      if (tokenValue === lastRegisteredFcmToken) {
        console.log('[native] FCM token already handled in this session');
        return;
      }
      lastRegisteredFcmToken = tokenValue;

      try {
        const { apiFetch } = await import('./config/api');
        console.log('[native] registering FCM token with backend');
        const response = await apiFetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenValue, platform: Capacitor.getPlatform() }),
        });

        console.log('[native] /api/push/register response:', response.status);

        if (!response.ok) {
          const responseText = await response.text().catch(() => '');
          console.warn('[native] FCM token registration rejected:', response.status, responseText.slice(0, 300));
          return;
        }

        pushNotificationsInitialized = true;
        console.log('[native] FCM token registered successfully');
      } catch (error) {
        console.warn('[native] FCM token backend registration failed:', error?.message || error);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[native] FCM registration error:', error?.error || error?.message || error);
    });

    console.log('[native] calling PushNotifications.register()');
    try {
      await PushNotifications.register();
      console.log('[native] PushNotifications.register() completed');
    } catch (error) {
      console.warn('[native] PushNotifications.register() failed:', error?.message || error);
      await registrationListener.remove().catch(() => {});
    }
  } catch (error) {
    console.warn('[native] push setup failed:', error?.message || error);
  }
}
