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
 * Subtle and minimal
 */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
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
 * Subtle lift animation for cards on hover
 * Minimal - Linear-like
 */
export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1, y: -2 },
};

/**
 * Modal backdrop fade animation
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/**
 * Modal content scale and fade animation
 */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

/**
 * Default transition for Linear-style animations
 * Subtle, smooth, and professional
 */
export const defaultTransition: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1], // Linear-style easing
};

/**
 * Fast transition for hover states
 */
export const fastTransition: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Modal transition
 */
export const modalTransition: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
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
 * Motion component wrappers
 */
export const MotionDiv = motion.div;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionP = motion.p;

