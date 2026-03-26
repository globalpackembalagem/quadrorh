import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from './Button';

const inputVariants = cva(
  'w-full rounded-xl border bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm px-4 transition-all duration-200 focus-visible:outline-none',
  {
    variants: {
      state: {
        default:
          'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        error:
          'border-error focus:border-error focus:ring-2 focus:ring-error/20',
        success:
          'border-success focus:border-success focus:ring-2 focus:ring-success/20',
      },
      size: {
        sm: 'h-9 text-sm',
        md: 'h-11 text-sm',
        lg: 'h-13 text-base',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, size, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            inputVariants({ state, size, className }),
            icon && 'pl-10'
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
