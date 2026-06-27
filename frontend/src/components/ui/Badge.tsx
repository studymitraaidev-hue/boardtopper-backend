import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'success' | 'danger' | 'indigo';
}

export const Badge = ({ className, variant = 'primary', ...props }: BadgeProps) => {
  const variants = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-50',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    gold: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-50',
    outline: 'bg-transparent border-slate-200 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-50',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-50',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
