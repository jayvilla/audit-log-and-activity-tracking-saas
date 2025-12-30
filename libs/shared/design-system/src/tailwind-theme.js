/**
 * Shared Tailwind CSS Theme Configuration
 * 
 * This file provides the token-based theme configuration for all apps.
 * It maps semantic color names to CSS variables defined in tokens.css.
 * 
 * Usage in tailwind.config.js:
 * const sharedTheme = require('../../libs/shared/design-system/src/tailwind-theme');
 * module.exports = {
 *   theme: {
 *     extend: sharedTheme,
 *   },
 * };
 */

module.exports = {
  colors: {
    // Background colors
    bg: 'hsl(var(--bg))',
    foreground: 'hsl(var(--foreground))',
    // Alias for backward compatibility
    fg: 'hsl(var(--foreground))',
    
    // Muted colors
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
      // Variant for backward compatibility
      '2': 'hsl(var(--muted-2))',
    },
    
    // Border
    border: 'hsl(var(--border))',
    
    // Card colors
    card: {
      DEFAULT: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
      // Variant for backward compatibility
      '2': 'hsl(var(--card-2))',
    },
    
    // Accent colors
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
      // Alias for backward compatibility
      '2': 'hsl(var(--accent2))',
    },
    
    // Secondary accent (accent2) - primary name
    accent2: {
      DEFAULT: 'hsl(var(--accent2))',
      foreground: 'hsl(var(--accent2-foreground))',
    },
    
    // Gradient colors (for gradient utilities)
    gradient: {
      from: 'hsl(var(--gradient-from))',
      via: 'hsl(var(--gradient-via))',
      to: 'hsl(var(--gradient-to))',
    },
  },
  
  fontFamily: {
    sans: ['var(--font-inter)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  },
};

