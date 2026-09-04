// Shared card system for the app.
//
// Instead of every card being the same dark rounded rectangle, we now have
// three deliberate weights so the eye knows what matters at a glance:
//   - "filled"  : the brand gradient. Reserve for ONE primary action per screen.
//   - "raised"  : the default content card (member info, stat groups, lists).
//   - "subtle"  : quiet/secondary info nested inside a raised card.

const VARIANTS = {
  filled: 'rounded-[1.5rem] overflow-hidden bg-gradient-to-r from-[#FF8B5C] via-pink-500 to-purple-400 border border-white/10 shadow-[0_20px_50px_rgba(163,77,255,0.25)]',
  raised: 'rounded-[1.5rem] overflow-hidden bg-slate-900 border border-slate-700 shadow-sm',
  subtle: 'rounded-[1.5rem] overflow-hidden bg-white/[0.07] border border-white/[0.12]',
  // Escape hatch for wrapping markup that doesn't match one of the three
  // deliberate looks above (e.g. an existing card-like block with its own
  // background/radius already tuned for its context) — contributes no
  // styling of its own, so nothing about how it currently looks changes.
  custom: '',
};

export function Card({ variant = 'raised', className = '', children, as: Comp = 'div', ...props }) {
  return (
    <Comp
      className={`${VARIANTS[variant] || VARIANTS.raised} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
}

// Small uppercase eyebrow label used consistently above card titles.
export function Eyebrow({ children, color = '#F7C948', className = '' }) {
  return (
    <p
      className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${className}`}
      style={{ color }}
    >
      {children}
    </p>
  );
}

// A row of stat tiles inside ONE card (with dividers) instead of N separate
// boxes competing for attention. Pass compact for tighter contexts (e.g. modals).
export function StatGroup({ items, compact = false }) {
  return (
    <Card variant="raised" className="p-0">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
        {items.map(({ label, value, icon: Icon, accent = '#FF4F9A' }, i) => (
          <div
            key={label}
            className={`text-center ${compact ? 'px-2 py-2.5' : 'px-3 py-4'} ${i > 0 ? 'border-l border-white/[0.06]' : ''}`}
          >
            {Icon && <Icon className={`mx-auto ${compact ? 'mb-1 h-3.5 w-3.5' : 'mb-1.5 h-4 w-4'}`} style={{ color: accent }} />}
            <p className={`font-bold text-white leading-none ${compact ? 'text-base' : 'text-xl'}`}>{value}</p>
            <p className={`font-semibold uppercase text-slate-500 ${compact ? 'mt-1 text-[9px] tracking-wide' : 'mt-1.5 text-[10px] tracking-widest'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// One clearly-primary call-to-action banner. Only ever use ONE of these
// per screen — that's what makes the gradient mean something.
export function ActionBanner({ eyebrow, title, subtitle, icon: Icon, onClick }) {
  return (
    <Card
      variant="filled"
      as="div"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="cursor-pointer p-5 text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          {eyebrow && <Eyebrow color="rgba(255,255,255,0.85)">{eyebrow}</Eyebrow>}
          <h2 className="mt-1.5 text-xl font-extrabold truncate">
            {title} <span className="text-white/80">▸</span>
          </h2>
          {subtitle && <p className="mt-1.5 text-sm text-white/85">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    </Card>
  );
}

// Compact info tile: icon + label + value. Used for profile detail grids.
export function InfoTile({ label, value, icon: Icon }) {
  return (
    <Card variant="subtle" className="p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/60 border border-white/[0.06] text-pink-500">
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 truncate">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-white truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}
