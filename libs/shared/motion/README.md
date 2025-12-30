# Shared Motion Library

This library provides centralized Framer Motion helpers and animations for all applications in the monorepo.

## Features

- **Reduced motion support**: Automatically respects `prefers-reduced-motion` media query
- **Consistent animations**: Subtle, professional animations matching Linear.app style
- **Shared variants**: Common animation patterns used across marketing and web apps

## Usage

```typescript
import { 
  useReducedMotion, 
  fadeSlideUp, 
  cardHover, 
  staggerContainer,
  defaultTransition,
  MotionDiv,
  MotionH1,
  MotionH2,
  MotionP,
  useMotionProps
} from '@audit-log-and-activity-tracking-saas/motion';
```

## Animation Variants

### `fadeSlideUp`
Fade in with subtle upward slide (y: 20px). Used for page content and sections.

### `fadeIn`
Simple fade in animation. Used for subtle reveals.

### `cardHover`
Hover animation for cards: `scale: 1.02, y: -4`. Provides subtle lift effect on hover.

### `staggerContainer`
Container variant that staggers children animations (0.1s delay between children).

### `pageTransition`
Page transition variant: subtle fade and slide (y: 8px) for route changes.

## Transitions

### `defaultTransition`
- Duration: 0.4s
- Easing: `[0.22, 1, 0.36, 1]` (Linear-style easing)

## Hooks

### `useReducedMotion()`
Returns `true` if the user prefers reduced motion. Automatically listens to media query changes.

### `useMotionProps(variants, transition?)`
Returns animation props that automatically respect reduced motion preferences.

## Motion Components

Pre-configured motion components:
- `MotionDiv`
- `MotionH1`
- `MotionH2`
- `MotionP`

## Design Philosophy

All animations follow these principles:
- **Subtle**: Not overly animated, professional feel
- **Fast**: Quick transitions (0.2-0.4s)
- **Accessible**: Respects `prefers-reduced-motion`
- **Consistent**: Same feel across marketing and web apps

