# Shared Design System

Centralized theme and styling tokens for all applications in the monorepo. This library provides the single source of truth for colors, typography, and background effects.

## Contents

- **`styles/tokens.css`** - CSS custom properties (variables) for colors and gradients
- **`styles/background.css`** - Grid and noise texture background effects
- **`styles/typography.css`** - Typography defaults and base styles

## Usage

### 1. Import CSS Files in Your App

In your app's global CSS file (e.g., `apps/web/src/app/globals.css` or `apps/marketing/src/app/global.css`), import the design system styles **before** your Tailwind directives:

```css
/* Import design system styles first (single entry point) */
@import '../../../../libs/shared/design-system/src/styles/index.css';

/* Then your Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Note:** CSS imports in Next.js require relative paths. Adjust the path based on your app's location:
- From `apps/marketing/src/app/global.css`: `../../../../libs/shared/design-system/src/styles/index.css`
- From `apps/web/src/app/globals.css`: `../../../../libs/shared/design-system/src/styles/index.css`

Alternatively, you can import individual style files if you need more granular control:
- `tokens.css` - CSS variables only
- `typography.css` - Typography and base styles
- `background.css` - Background effects only

### 2. Set Up Inter Font (Next.js Apps)

In your app's root layout (e.g., `apps/web/src/app/layout.tsx`), configure the Inter font:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

### 3. Use CSS Variables in Tailwind

The CSS variables are available for use in Tailwind classes:

```tsx
// Background colors
<div className="bg-[hsl(var(--bg))]">
<div className="bg-[hsl(var(--card))]">
<div className="bg-[hsl(var(--muted))]">

// Text colors
<p className="text-[hsl(var(--foreground))]">
<p className="text-[hsl(var(--muted-foreground))]">

// Borders
<div className="border-[hsl(var(--border))]">

// Accent colors
<button className="bg-[hsl(var(--accent2))] text-[hsl(var(--accent2-foreground))]">
```

### 4. Background Effects

The background effects (grid and noise texture) are automatically applied via `body::before` and `body::after` pseudo-elements when you import `background.css`. Ensure your main content has `position: relative` and `z-index: 1` to appear above the effects.

## Available CSS Variables

### Colors
- `--bg` - Main background color
- `--foreground` - Main text color
- `--muted` - Muted background
- `--muted-foreground` - Muted text color
- `--border` - Border color
- `--card` - Card background
- `--card-foreground` - Card text color
- `--accent` - Accent background
- `--accent-foreground` - Accent text color
- `--accent2` - Secondary accent background
- `--accent2-foreground` - Secondary accent text color

### Gradients
- `--gradient-from` - Gradient start color
- `--gradient-via` - Gradient middle color
- `--gradient-to` - Gradient end color

## Migration from App-Specific Styles

If you're migrating from app-specific styles (e.g., `apps/marketing/src/app/global.css`):

1. Remove the CSS variable definitions from your app's global CSS
2. Remove the background effect styles (`body::before`, `body::after`, `@keyframes noise`)
3. Remove the typography base styles
4. Import the design system styles as shown above
5. Ensure your font setup matches the pattern above

## Building

Run `pnpm nx build design-system` to build the library.

## Running unit tests

Run `pnpm nx test design-system` to execute the unit tests via [Jest](https://jestjs.io).
