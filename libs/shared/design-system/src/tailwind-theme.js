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
    // Background colors - Exact Figma values
    bg: 'var(--bg)',
    'bg-overlay': 'var(--bg-overlay)',
    'bg-card': 'var(--bg-card)',
    'bg-gradient-from': 'var(--bg-gradient-from)',
    'bg-gradient-to': 'var(--bg-gradient-to)',
    
    // UI Element Backgrounds
    'bg-ui-50': 'var(--bg-ui-50)',
    'bg-ui-40': 'var(--bg-ui-40)',
    'bg-ui-30': 'var(--bg-ui-30)',
    'bg-ui-20': 'var(--bg-ui-20)',
    
    // Foreground/Text colors - Exact Figma values
    fg: 'var(--fg)',
    'fg-muted': 'var(--fg-muted)',
    'fg-on-accent': 'var(--fg-on-accent)',
    
    // Alias for backward compatibility
    foreground: 'var(--fg)',
    
    // Border colors
    border: 'var(--border)',
    'border-transparent': 'var(--border-transparent)',
    
    // Accent/Primary colors - Exact Figma values
    accent: {
      DEFAULT: 'var(--accent)',
      '10': 'var(--accent-10)',
      '30': 'var(--accent-30)',
      '05': 'var(--accent-05)',
    },
    // Primary alias for accent
    primary: {
      DEFAULT: 'var(--accent)',
      '10': 'var(--accent-10)',
      '30': 'var(--accent-30)',
      '05': 'var(--accent-05)',
      foreground: 'var(--fg-on-accent)',
    },
    
    // Semantic colors - Exact Figma values
    semantic: {
      success: 'var(--semantic-success)',
      info: 'var(--semantic-info)',
      purple: 'var(--semantic-purple)',
    },
    
    // Legacy aliases for backward compatibility (will be deprecated)
    muted: {
      DEFAULT: 'var(--bg-card)',
      foreground: 'var(--fg-muted)',
    },
    card: {
      DEFAULT: 'var(--bg-card)',
      foreground: 'var(--fg)',
    },
    accent2: {
      DEFAULT: 'var(--accent)',
      foreground: 'var(--fg-on-accent)',
    },
  },
  
  fontFamily: {
    sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
  },
  
  spacing: {
    '1': 'var(--spacing-1)',
    '2': 'var(--spacing-2)',
    '3': 'var(--spacing-3)',
    '4': 'var(--spacing-4)',
    '6': 'var(--spacing-6)',
    '8': 'var(--spacing-8)',
    '10': 'var(--spacing-10)',
  },
  
  borderRadius: {
    // Exact Figma values
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    pill: 'var(--radius-pill)',
    // Legacy aliases
    full: '9999px',
  },
  
  boxShadow: {
    accent: 'var(--shadow-accent)',
    primary: 'var(--shadow-accent)',
    // Legacy shadows for backward compatibility
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};
