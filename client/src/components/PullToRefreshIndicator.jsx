// Small spinner that grows with pull distance, then spins in place while
// refreshing. Renders nothing at rest so it never affects layout when the
// page isn't being pulled. Colors follow the established brand gradient
// (used for the spinner's leading edge only, not a new palette entry).
export default function PullToRefreshIndicator({ pullDistance, refreshing }) {
  if (pullDistance <= 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / 70, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{ height: refreshing ? 40 : pullDistance }}
      aria-hidden={!refreshing}
      aria-live={refreshing ? 'polite' : undefined}
      aria-label={refreshing ? 'Refreshing' : undefined}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 border-white/15 ${refreshing ? 'animate-spin' : ''}`}
        style={{
          borderTopColor: '#EC2FA8',
          opacity: refreshing ? 1 : progress,
          transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
        }}
      />
    </div>
  );
}
