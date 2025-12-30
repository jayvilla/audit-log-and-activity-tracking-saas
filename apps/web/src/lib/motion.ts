/**
 * Re-export from shared motion library
 * This file maintains backward compatibility while using the shared library
 * 
 * Additional web-specific variants are exported below for components that need them
 */
export * from '@audit-log-and-activity-tracking-saas/motion';

import { type Variants, type Transition } from 'framer-motion';

/**
 * Fast transition for hover states
 */
export const fastTransition: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
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
 * Modal transition
 */
export const modalTransition: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

