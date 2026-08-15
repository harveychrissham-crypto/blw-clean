/**
 * Lightweight haptic feedback helper.
 *
 * Uses the standard Web Vibration API (navigator.vibrate), which Android's
 * Capacitor WebView (Chromium) supports natively with zero extra setup.
 *
 * iOS's WKWebView does NOT support navigator.vibrate -- Safari has never
 * implemented the Vibration API, so this silently no-ops on iOS today.
 * Real iOS haptics would need the @capacitor/haptics native plugin, which
 * is a new dependency not yet in this repo (see the project's "no new
 * dependencies" constraint) -- flagged for approval, not added here.
 *
 * This file is the single seam: if/when @capacitor/haptics is approved,
 * only the internals of vibrate() need a native branch. Nothing that calls
 * hapticTap()/hapticSuccess()/hapticError() needs to change.
 */
function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration unsupported or blocked -- silently no-op.
  }
}

/** Very short pulse for ordinary taps (buttons, links, nav items). */
export function hapticTap() {
  vibrate(10);
}

/** Double-pulse for confirmations (saved, signed in, sent). */
export function hapticSuccess() {
  vibrate([12, 40, 12]);
}

/** Triple-pulse for errors/failures. */
export function hapticError() {
  vibrate([20, 30, 20, 30, 20]);
}

/**
 * Binds a single passive, capturing click listener to the document that
 * fires a light haptic tap whenever the user activates a button, link, or
 * anything with role="button" -- without touching any individual
 * component's markup or handlers.
 *
 * Deliberately global rather than per-component: this codebase has 130+
 * interactive elements across pages/ and components/, and wiring each one
 * by hand would mean editing every file (high risk of missing some, and a
 * large diff for a purely additive feature). A single delegated listener
 * covers all of them today and automatically covers new ones added later.
 */
export function bindGlobalTapHaptics() {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target.closest?.('button, a[href], [role="button"]');
      if (!target || target.disabled) return;
      hapticTap();
    },
    { capture: true, passive: true }
  );
}
