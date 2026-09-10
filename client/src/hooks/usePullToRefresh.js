import { useCallback, useRef, useState } from 'react';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const TRIGGER_DISTANCE = 70;
const MAX_PULL_DISTANCE = 110;
const DRAG_RESISTANCE = 0.5;

export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const isTracking = useRef(false);
  const triggered = useRef(false);

  const onTouchStart = useCallback((e) => {
    if (!enabled || refreshing) return;
    if (window.scrollY > 0) {
      startY.current = null;
      isTracking.current = false;
      return;
    }
    startY.current = e.touches[0].clientY;
    isTracking.current = true;
    triggered.current = false;
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
    const distance = Math.min(delta * DRAG_RESISTANCE, MAX_PULL_DISTANCE);
    setPullDistance(distance);
    if (distance >= TRIGGER_DISTANCE && !triggered.current) {
      triggered.current = true;
      hapticTap();
    } else if (distance < TRIGGER_DISTANCE) {
      triggered.current = false;
    }
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
        hapticSuccess();
      } catch {
        hapticError();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        triggered.current = false;
      }
    } else {
      setPullDistance(0);
      triggered.current = false;
    }
  }, [pullDistance, onRefresh]);

  const onTouchCancel = useCallback(() => {
    isTracking.current = false;
    startY.current = null;
    triggered.current = false;
    setPullDistance(0);
  }, []);

  return {
    pullDistance,
    refreshing,
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}
