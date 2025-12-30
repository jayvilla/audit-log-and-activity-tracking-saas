'use client';

import { motion, type Variants, type Transition } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Respects prefers-reduced-motion media query
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Linear-style fade and slide up animation variants
 */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Linear-style fade in animation variants
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/**
 * Subtle scale animation for cards on hover
 */
export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4 },
};

/**
 * Default transition for Linear-style animations
 * Subtle, smooth, and professional
 */
export const defaultTransition: Transition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1], // Linear-style easing
};

/**
 * Stagger transition for container children
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Get animation props that respect reduced motion preference
 */
export function useMotionProps(variants: Variants, transition?: Transition) {
  const prefersReducedMotion = useReducedMotion();

  return {
    variants: prefersReducedMotion ? {} : variants,
    transition: prefersReducedMotion
      ? { duration: 0 }
      : transition || defaultTransition,
    initial: prefersReducedMotion ? false : 'hidden',
    animate: prefersReducedMotion ? false : 'visible',
  };
}

/**
 * Motion component wrapper that automatically respects reduced motion
 */
export const MotionDiv = motion.div;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionP = motion.p;

