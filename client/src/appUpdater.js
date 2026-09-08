import { Capacitor, registerPlugin } from '@capacitor/core';

export const UPDATE_AVAILABLE_EVENT = 'blw:update-available';

const REPO = 'harveychrissham-crypto/blw-clean';
const RELEASE_TAG = 'latest-android';
const FALLBACK_APK_URL = `https://github.com/${REPO}/releases/download/${RELEASE_TAG}/blw-campus-ministry.apk`;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const ApkInstaller = registerPlugin('ApkInstaller');
let lastCheckAt = 0;
let checkInFlight = null;
let appStateListener = null;

function compareVersions(a, b) {
  const partsA = String(a).split('.').map((value) => Number.parseInt(value, 10) || 0);
  const partsB = String(b).split('.').map((value) => Number.parseInt(value, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (partsA[index] || 0) - (partsB[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function dispatchUpdate(currentVersion, latestVersion, updateUrl) {
  window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT, {
    detail: { currentVersion, latestVersion, updateUrl },
  }));
}

export async function checkForAppUpdate({ force = false } = {}) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  if (!force && Date.now() - lastCheckAt < CHECK_INTERVAL_MS) return null;
  if (checkInFlight) return checkInFlight;

  checkInFlight = (async () => {
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      const currentVersion = String(info?.version || '').trim();
      if (!currentVersion) return null;

      const response = await fetch(
        `https://api.github.com/repos/${REPO}/releases/tags/${RELEASE_TAG}`,
        {
          method: 'GET',
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store',
        },
      );

      if (!response.ok) return null;

      const release = await response.json();
      const body = String(release?.body || '');
      const versionMatch = body.match(/(?:^|\n)\s*Version:\s*([0-9]+(?:\.[0-9]+)*)/i);
      const latestVersion = String(versionMatch?.[1] || '').trim();
      if (!latestVersion || compareVersions(currentVersion, latestVersion) >= 0) return null;

      const asset = Array.isArray(release?.assets)
        ? release.assets.find((item) => item?.name === 'blw-campus-ministry.apk')
        : null;
      const updateUrl = String(asset?.browser_download_url || FALLBACK_APK_URL).trim();

      dispatchUpdate(currentVersion, latestVersion, updateUrl);
      return { currentVersion, latestVersion, updateUrl };
    } catch (error) {
      console.warn('[appUpdater] update check failed:', error?.message || error);
      return null;
    } finally {
      lastCheckAt = Date.now();
      checkInFlight = null;
    }
  })();

  return checkInFlight;
}

export async function initAppUpdateChecker() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  await checkForAppUpdate({ force: true });

  if (!appStateListener) {
    try {
      const { App } = await import('@capacitor/app');
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkForAppUpdate();
      });
    } catch (error) {
      console.warn('[appUpdater] app-state listener skipped:', error?.message || error);
      appStateListener = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForAppUpdate();
  });
}

export async function installApk(url) {
  const updateUrl = String(url || '').trim();
  if (!updateUrl || !/^https:\/\//i.test(updateUrl)) {
    throw new Error('A valid HTTPS APK URL is required.');
  }

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    window.open(updateUrl, '_blank', 'noopener,noreferrer');
    return { native: false };
  }

  const result = await ApkInstaller.installApk({ url: updateUrl });
  return result || { native: true };
}
