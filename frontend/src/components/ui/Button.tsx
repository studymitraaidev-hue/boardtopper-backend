import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'danger' | 'white';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
    const base = 'relative inline-flex items-center justify-center font-semibold transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:!transform-none gap-2';
    const variants = {
      primary:   'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500 shadow-sm hover:shadow-md',
      secondary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm hover:shadow-lg hover:shadow-blue-100',
      outline:   'border-2 border-slate-200 bg-transparent hover:bg-slate-50 text-slate-800 focus-visible:ring-slate-400',
      ghost:     'bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400',
      gold:      'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400 shadow-sm hover:shadow-lg hover:shadow-amber-100',
      danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
      white:     'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm',
    };
    const sizes = {
      xs: 'h-7 px-3 text-xs rounded-lg',
      sm: 'h-9 px-4 text-sm rounded-xl',
      md: 'h-11 px-5 text-sm rounded-xl',
      lg: 'h-13 px-7 text-base rounded-2xl',
      xl: 'h-14 px-8 text-base rounded-2xl font-bold',
    };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)} disabled={isLoading || disabled} {...props}>
        {isLoading ? <><svg className="mr-1.5 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Loading…</> : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
