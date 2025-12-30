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
  
  borderRadius: {
    // Minimal, Linear-style border radius
    sm: '0.375rem',   // 6px - small elements
    md: '0.5rem',     // 8px - buttons, inputs
    lg: '0.75rem',    // 12px - cards, modals (default)
    xl: '1rem',       // 16px - large cards
    full: '9999px',   // full - badges, avatars
  },
  
  boxShadow: {
    // Minimal shadows - Linear-style
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    // Cards typically use no shadow (bordered variant) or minimal shadow
    // Dropdowns and modals use shadow-lg
  },
};

