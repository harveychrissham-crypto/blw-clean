import { useCallback, useRef, useState } from 'react';

// Pull-to-refresh for pages that scroll on the window/body (this app has no
// inner scroll containers on data pages - see Layout.jsx, `<main>` has no
// overflow rules of its own). Gesture only engages when the page is already
// scrolled to the top, matching native app behavior and avoiding any
// conflict with normal vertical scrolling further down the page.
const TRIGGER_DISTANCE = 70;
const MAX_PULL_DISTANCE = 110;
const DRAG_RESISTANCE = 0.5;

export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const isTracking = useRef(false);

  const onTouchStart = useCallback((e) => {
    if (!enabled || refreshing) return;
    if (window.scrollY > 0) {
      startY.current = null;
      isTracking.current = false;
      return;
    }
    startY.current = e.touches[0].clientY;
    isTracking.current = true;
  }, [enabled, refreshing]);

  const onTouchMove = useCallback((e) => {
    if (!enabled || !isTracking.current || startY.current == null) return;
    if (window.scrollY > 0) {
      isTracking.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(delta * DRAG_RESISTANCE, MAX_PULL_DISTANCE));
  }, [enabled]);

  const onTouchEnd = useCallback(async () => {
    if (!isTracking.current) return;
    isTracking.current = false;
    startY.current = null;

    if (pullDistance >= TRIGGER_DISTANCE) {
      setRefreshing(true);
      setPullDistance(TRIGGER_DISTANCE);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  const onTouchCancel = useCallback(() => {
    isTracking.current = false;
    startY.current = null;
    setPullDistance(0);
  }, []);

  return {
    pullDistance,
    refreshing,
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}
