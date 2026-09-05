import { forwardRef } from 'react';

// Shared button styles, extracted from the most common patterns already in
// use across the app (see the color-token/a11y pass earlier this session).
// `variant` controls color/intent, `size` controls the two shapes actually
// used elsewhere: "md" for page-level CTAs (rounded-2xl, larger), "sm" for
// compact pill-shaped actions (rounded-full, smaller). These aren't
// invented — they're the majority pattern pulled straight from the
// existing pages, so consolidating into this component shouldn't shift how
// anything already using one of these looks.

const VARIANTS = {
  primary: 'bg-gold-500 text-ink-900 font-bold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
  secondary: 'border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50',
  ghost: 'border border-white/15 text-white/80 font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'border border-red-400/30 bg-red-500/10 text-red-200 font-semibold hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50',
  gradient: 'bg-gradient-to-r from-pink-600 via-purple-500 to-indigo-500 text-white font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
  link: 'font-medium',
  custom: '',
};

const SIZES = {
  md: 'rounded-2xl px-5 py-3 text-sm',
  sm: 'rounded-full px-4 py-2 text-xs',
  none: '',
};

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  return <button ref={ref} type={type} className={`${sizeClass} ${variantClass} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${className}`.trim()} {...props} />;
});

export default Button;

const ICON_SIZES = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

// Circular icon-only button — the other recurring shape across the app
// (close buttons, back arrows, compact controls). Always needs an
// aria-label since there's no visible text.
export const IconButton = forwardRef(function IconButton({ variant = 'ghost', size = 'md', className = '', type = 'button', 'aria-label': ariaLabel, ...props }, ref) {
  const variantClass = VARIANTS[variant] || VARIANTS.ghost;
  const sizeClass = ICON_SIZES[size] || ICON_SIZES.md;
  if (!ariaLabel && import.meta.env.DEV) {
    console.warn('IconButton rendered without an aria-label — icon-only buttons need one for screen readers.');
  }
  return <button ref={ref} type={type} aria-label={ariaLabel} className={`grid ${sizeClass} shrink-0 place-items-center rounded-full ${variantClass} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${className}`.trim()} {...props} />;
});
