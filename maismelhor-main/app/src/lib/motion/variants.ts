import { type Variant } from 'framer-motion';

export const fadeIn: Record<string, Variant> = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const fadeInScale: Record<string, Variant> = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { 
      type: 'spring',
      bounce: 0.5,
      duration: 0.8
    },
  },
};

export const slideFromRight: Record<string, Variant> = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const slideFromBottom: Record<string, Variant> = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const staggerContainer: Record<string, Variant> = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const cardHover: Record<string, Variant> = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.015,
    y: -2,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1, ease: 'easeOut' },
  }
};

export const pageVariants: Record<string, Variant> = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export const pageStagger: Record<string, Variant> = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.05 },
  },
};

export const springScaleIn: Record<string, Variant> = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: 'spring', 
      bounce: 0.55,
      duration: 1.0
    },
  },
};
