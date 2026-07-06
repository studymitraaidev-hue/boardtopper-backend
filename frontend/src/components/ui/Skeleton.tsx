import { cn } from '../../utils/cn';

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export const SkeletonLine = ({
  width = '100%',
  height = '1rem',
  className,
}: SkeletonLineProps) => (
  <div
    className={cn('animate-pulse bg-slate-200 rounded-lg', className)}
    style={{ width, height }}
  />
);

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard = ({ className }: SkeletonCardProps) => (
  <div className={cn('animate-pulse bg-slate-200 rounded-2xl p-4 space-y-3', className)}>
    <SkeletonLine width="60%" height="1rem" className="bg-slate-300" />
    <SkeletonLine width="100%" height="0.75rem" className="bg-slate-300" />
    <SkeletonLine width="80%" height="0.75rem" className="bg-slate-300" />
  </div>
);

interface SkeletonAvatarProps {
  size?: number;
}

export const SkeletonAvatar = ({ size = 40 }: SkeletonAvatarProps) => (
  <div
    className="animate-pulse bg-slate-200 rounded-full shrink-0"
    style={{ width: size, height: size }}
  />
);
