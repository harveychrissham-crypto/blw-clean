// Consistent empty state: icon in a soft gradient ring, one clear line of
// what's missing, one line of what to do about it, and an optional action.
// Used anywhere a list/log/record has nothing in it yet.

export default function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center">
      {Icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#FF4F9A]/20 via-[#A53DFF]/20 to-[#3D5AFE]/20 text-[#FF9CEA]">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-white">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
