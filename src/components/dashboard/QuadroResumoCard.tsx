import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface QuadroResumoCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

export function QuadroResumoCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className,
}: QuadroResumoCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    info: 'border-info/30 bg-info/5',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 transition-all hover:shadow-md',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className={cn('text-3xl font-bold mt-1 tabular-nums', valueStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg', variantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
