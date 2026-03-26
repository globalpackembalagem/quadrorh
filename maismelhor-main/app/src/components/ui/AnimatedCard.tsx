import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeInScale, cardHover } from '../../lib/motion/variants';
import { cn } from './Button';

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  glass?: 1 | 2 | 3;
  interactive?: boolean;
}

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, glass = 1, interactive = false, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={interactive ? { ...fadeInScale, ...cardHover } : fadeInScale}
        whileHover={interactive ? 'hover' : undefined}
        whileTap={interactive ? 'tap' : undefined}
        className={cn(
          `glass-${glass} rounded-2xl p-4 relative overflow-hidden highlight-top`,
          interactive && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = 'AnimatedCard';
