// Loading skeletons — used instead of a blank flash while async data resolves.
// The shimmer is intentionally subtle so it feels native to the dark feed UI.

const shimmerBg =
  'bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0.075)_45%,rgba(255,255,255,0.035)_70%)] bg-[length:220%_100%]';

export function Skeleton({ className = '' }) {
  return (
    <>
      <style>{`@keyframes blwSkeletonShimmer{0%{background-position:120% 0}100%{background-position:-120% 0}}@media(prefers-reduced-motion:reduce){.blw-skeleton-shimmer{animation:none!important}}`}</style>
      <div
        aria-hidden="true"
        className={`blw-skeleton-shimmer rounded-xl ${shimmerBg} ${className}`}
        style={{ animation: 'blwSkeletonShimmer 1.8s ease-in-out infinite' }}
      />
    </>
  );
}

// A raised-weight card skeleton — mirrors <Card variant="raised"> proportions.
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`rounded-[1.5rem] border border-slate-700 bg-slate-900 p-5 ${className}`}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

// A single list-row skeleton — mirrors a <Card variant="subtle"> row.
export function SkeletonRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] p-4 ${className}`}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

// A grid of stacked row skeletons — for lists/search results while loading.
export function SkeletonList({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
