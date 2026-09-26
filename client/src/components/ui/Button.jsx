import { forwardRef } from 'react';

// Shared Emet button styles: neutral white, black, and subtle borders. Buttons use
// compact 10px corners for a modern professional interface — replacing the
// mix of 2xl/3xl used ad hoc across the app.
//
// NOTE: Tailwind's JIT compiler scans source files as literal text for
// class name strings — it cannot resolve `` `bg-[${var}]` `` from a JS
// variable. Every arbitrary-value class below must therefore be a static,
// fully-written-out string, not built by interpolating a shared hex
// constant, or the utility silently never gets generated.

const VARIANTS = {
  primary: 'bg-white text-[#0B0F14] shadow-sm hover:bg-white/90 active:bg-white/80 active:shadow-none disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none',
  secondary: 'border border-white/15 bg-white/[.05] text-white hover:bg-white/[.09] hover:border-white/30 active:bg-white/[.12] disabled:cursor-not-allowed disabled:opacity-40 disabled:border-white/10',
  ghost: 'border border-white/15 text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40',
  danger: 'border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 active:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40',
  gradient: 'bg-white text-[#0B0F14] text-white shadow-sm hover:bg-white/90 active:bg-[#1A8CD8] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
  link: 'text-white/80 hover:text-white font-medium',
  custom: '',
};

const SIZES = {
  md: 'rounded-[10px] px-5 py-2.5 text-sm font-semibold min-h-11',
  sm: 'rounded-[10px] px-4 py-2.5 text-xs font-semibold min-h-10',
  none: '',
};

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', style, invisible = false, ...props }, ref) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const buttonStyle = invisible
    ? { backgroundColor: 'transparent', border: 0, padding: 0, margin: 0, boxShadow: 'none', color: 'transparent', ...style }
    : style;
  const pressClass = invisible ? '' : 'active:scale-[0.97]';
  return <button ref={ref} type={type} className={`${sizeClass} ${variantClass} ${pressClass} transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${className}`.trim()} style={buttonStyle} {...props} />;
});

export default Button;

const ICON_SIZES = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

// Compact icon-only button — the other recurring shape across the app
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
  return <button ref={ref} type={type} aria-label={ariaLabel} className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl ${variantClass} active:scale-[0.94] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/60 ${className}`.trim()} {...props} />;
});
