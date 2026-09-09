import { Capacitor } from '@capacitor/core';

/**
 * Single seam for "share this" across the app (sermon detail, event detail,
 * outreach story). Tries three tiers, each falling back to the next:
 *
 *  1. @capacitor/share on native platforms -- opens the OS share sheet
 *     (WhatsApp, SMS, etc.), which navigator.share() alone doesn't reach
 *     reliably inside a Capacitor WebView on all Android versions.
 *  2. navigator.share() on web/browsers that support the Web Share API.
 *  3. Clipboard copy as the final fallback (older browsers, desktop
 *     Chrome without Web Share support, etc.) -- resolves with
 *     { method: 'clipboard' } so callers can show their own toast/confirmation.
 *
 * Never throws for an expected "user cancelled the share sheet" case; those
 * resolve with { method: 'cancelled' } instead so callers don't need a
 * try/catch just to ignore a cancel.
 */
export async function shareContent({ title, text, url }) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return { method: 'native' };
    } catch (error) {
      if (isUserCancelled(error)) return { method: 'cancelled' };
      console.warn('[share] @capacitor/share failed, falling back:', error?.message || error);
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return { method: 'web' };
    } catch (error) {
      if (isUserCancelled(error)) return { method: 'cancelled' };
      console.warn('[share] navigator.share failed, falling back:', error?.message || error);
    }
  }

  try {
    await navigator.clipboard.writeText(url || text || title || '');
    return { method: 'clipboard' };
  } catch (error) {
    console.warn('[share] clipboard fallback failed:', error?.message || error);
    return { method: 'failed' };
  }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn('[clipboard] navigator.clipboard failed, trying legacy fallback:', error?.message || error);
  }
  // Legacy fallback for WebViews/browsers where the modern Clipboard API is
  // missing or silently fails (seen in some Android WebView versions).
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (error) {
    console.warn('[clipboard] legacy fallback failed:', error?.message || error);
    return false;
  }
}

function isUserCancelled(error) {
  // Web Share API and @capacitor/share both use AbortError-style names/
  // messages when the person dismisses the native share sheet.
  return error?.name === 'AbortError' || /cancel/i.test(error?.message || '');
}
