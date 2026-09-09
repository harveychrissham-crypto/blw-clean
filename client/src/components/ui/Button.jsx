import { forwardRef } from 'react';

// Shared button styles. One deliberate accent story instead of several
// competing ones: magenta (#EC2FA8) is already the app's interactive color
// (input focus borders, text selection) — primary actions now use it too,
// instead of generic Tailwind purple. Secondary actions use the deep purple
// already present in the page background gradient (#3C1464), so buttons
// read as part of the same palette as the page rather than a mismatched
// swatch sitting on top of it. Two radius tokens only: pill (rounded-full)
// for compact/icon actions, rounded-xl for everything else — replacing the
// mix of 2xl/3xl used ad hoc across the app.
//
// NOTE: Tailwind's JIT compiler scans source files as literal text for
// class name strings — it cannot resolve `` `bg-[${var}]` `` from a JS
// variable. Every arbitrary-value class below must therefore be a static,
// fully-written-out string, not built by interpolating a shared hex
// constant, or the utility silently never gets generated.

const VARIANTS = {
  primary: 'bg-[#A62574] text-white shadow-[0_6px_16px_-8px_rgba(166,37,116,0.5)] hover:bg-[#BC2E85] active:bg-[#7D1C59] active:shadow-none disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none',
  secondary: 'border border-[#EC2FA8]/20 bg-[#3C1464]/60 text-white hover:bg-[#4D1B82]/70 hover:border-[#EC2FA8]/30 active:bg-[#3C1464] disabled:cursor-not-allowed disabled:opacity-40 disabled:border-white/10',
  ghost: 'border border-white/15 text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40',
  danger: 'border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 active:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40',
  gradient: 'bg-gradient-to-r from-[#A62574] to-[#3C1464] text-white shadow-[0_6px_16px_-8px_rgba(166,37,116,0.4)] hover:brightness-105 active:brightness-90 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
  link: 'text-[#EC2FA8] hover:text-[#F04FB8] font-medium',
  custom: '',
};

const SIZES = {
  md: 'rounded-xl px-5 py-3 text-sm font-semibold',
  sm: 'rounded-full px-4 py-2 text-xs font-semibold',
  none: '',
};

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', style, invisible = false, ...props }, ref) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const buttonStyle = invisible
    ? { backgroundColor: 'transparent', border: 0, padding: 0, margin: 0, boxShadow: 'none', color: 'transparent', ...style }
    : style;
  const pressClass = invisible ? '' : 'active:scale-[0.97]';
  return <button ref={ref} type={type} className={`${sizeClass} ${variantClass} ${pressClass} transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2FA8]/60 ${className}`.trim()} style={buttonStyle} {...props} />;
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
// aria-label since there's no visible text. Carries a hairline border by
// default so it reads as a deliberate control against the busy background
// instead of a translucent void.
export const IconButton = forwardRef(function IconButton({ variant = 'ghost', size = 'md', className = '', type = 'button', 'aria-label': ariaLabel, ...props }, ref) {
  const variantClass = VARIANTS[variant] || VARIANTS.ghost;
  const sizeClass = ICON_SIZES[size] || ICON_SIZES.md;
  if (!ariaLabel && import.meta.env.DEV) {
    console.warn('IconButton rendered without an aria-label — icon-only buttons need one for screen readers.');
  }
  return <button ref={ref} type={type} aria-label={ariaLabel} className={`grid ${sizeClass} shrink-0 place-items-center rounded-full ${variantClass} active:scale-[0.94] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2FA8]/60 ${className}`.trim()} {...props} />;
});
