/**
 * Phase 4 UI Test Setup
 * 
 * Configures testing environment for React components.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import * as React from 'react';

// Mock Next.js Link component
// Type assertion needed for mock props spreading
type LinkProps = {
  children: React.ReactNode;
  href: string;
} & Record<string, unknown>;

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: LinkProps) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

