import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = ({ className, children, hoverEffect = false, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm',
        hoverEffect && 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 py-4 border-b border-slate-50', className)}>{children}</div>
);

export const CardContent = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6', className)}>{children}</div>
);

export const CardFooter = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 py-4 bg-slate-50/50 border-t border-slate-50', className)}>{children}</div>
);
