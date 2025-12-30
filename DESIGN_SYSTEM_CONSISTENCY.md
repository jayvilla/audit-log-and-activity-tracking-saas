# Design System Consistency Checklist

## ✅ Completed Unifications

### 1. **Shared Design System Library**
- **Location**: `libs/shared/design-system/`
- **Files**:
  - `src/styles/tokens.css` - CSS variables (colors, gradients)
  - `src/styles/typography.css` - Typography defaults
  - `src/styles/background.css` - Grid/noise background effects
  - `src/tailwind-theme.js` - Tailwind theme configuration
- **Usage**: Both `apps/web` and `apps/marketing` import from this shared library

### 2. **Shared Motion Library**
- **Location**: `libs/shared/motion/`
- **Files**: `src/motion.ts` - Framer Motion helpers and animations
- **Usage**: Both apps re-export from shared library for consistent animations

### 3. **Typography**
- **Font**: Inter (via `next/font/google`)
- **Font Sizes**: Standard Tailwind scale (`text-xs` to `text-3xl`)
- **Font Weights**: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700)
- **Line Height**: Default 1.5 (via typography.css)
- **Letter Spacing**: Headings use `-0.025em` (via typography.css)

### 4. **Spacing**
- **Grid**: 4px base unit
- **Scale**: Tailwind default (0.25rem = 4px increments)
- **Usage**: Both apps use standard Tailwind spacing classes (`p-4`, `gap-2`, `m-8`, etc.)

### 5. **Border Radius**
- **Tokens**: Defined in `libs/shared/design-system/src/tailwind-theme.js`
- **Values**:
  - `rounded-sm` = 6px (small elements)
  - `rounded-md` = 8px (buttons, inputs)
  - `rounded-lg` = 12px (cards, modals - **default**)
  - `rounded-xl` = 16px (large cards)
  - `rounded-full` = 9999px (badges, avatars)

### 6. **Shadows**
- **Tokens**: Defined in `libs/shared/design-system/src/tailwind-theme.js`
- **Values**:
  - `shadow-sm` = Minimal shadow
  - `shadow-md` = Medium shadow
  - `shadow-lg` = Large shadow (used for dropdowns, modals)
- **Usage**: Cards typically use no shadow (bordered variant) or minimal shadow

### 7. **Colors**
- **Tokens**: Defined in `libs/shared/design-system/src/styles/tokens.css`
- **Tailwind Classes**: Available via `libs/shared/design-system/src/tailwind-theme.js`
- **Usage Pattern**:
  - `bg-bg` or `bg-[hsl(var(--bg))]` → Background
  - `text-foreground` or `text-[hsl(var(--foreground))]` → Primary text
  - `text-muted-foreground` or `text-[hsl(var(--muted-foreground))]` → Secondary text
  - `bg-card` or `bg-[hsl(var(--card))]` → Card background
  - `border-border` or `border-[hsl(var(--border))]` → Borders
  - `bg-accent2` or `bg-[hsl(var(--accent2))]` → Primary accent (blue)

## 📍 Token Locations

### CSS Variables (Design Tokens)
**Location**: `libs/shared/design-system/src/styles/tokens.css`

```css
--bg: 240 10% 3.9%;
--foreground: 0 0% 98%;
--muted: 240 3.7% 15.9%;
--muted-foreground: 240 5% 64.9%;
--border: 240 3.7% 15.9%;
--card: 240 5.5% 8.5%;
--card-foreground: 0 0% 98%;
--accent2: 217 91% 60%;
--accent2-foreground: 0 0% 98%;
```

### Tailwind Theme Configuration
**Location**: `libs/shared/design-system/src/tailwind-theme.js`

- Colors: `bg-bg`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-accent2`
- Border Radius: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
- Font Family: `font-sans` (Inter)

### Typography Defaults
**Location**: `libs/shared/design-system/src/styles/typography.css`

- Base font family: Inter (via CSS variable)
- Headings: `font-weight: 600`, `letter-spacing: -0.025em`
- Body: Default line-height 1.5

### Background Effects
**Location**: `libs/shared/design-system/src/styles/background.css`

- Grid pattern overlay
- Subtle noise texture animation

## 🔄 Migration Notes

### Inline `hsl(var(--...))` Usage
Some components in `apps/web` still use inline `hsl(var(--...))` syntax. These can be replaced with Tailwind classes:
- `bg-[hsl(var(--bg))]` → `bg-bg`
- `text-[hsl(var(--foreground))]` → `text-foreground`
- `text-[hsl(var(--muted-foreground))]` → `text-muted-foreground`
- `border-[hsl(var(--border))]` → `border-border`
- `bg-[hsl(var(--card))]` → `bg-card`
- `bg-[hsl(var(--accent2))]` → `bg-accent2`

**Note**: Both syntaxes work, but Tailwind classes are preferred for consistency and better IDE support.

## 📄 Pages Reviewed

### ✅ Login Page (`apps/web/src/app/(public)/login/page.tsx`)
- Uses shared UI components from `@audit-log-and-activity-tracking-saas/ui`
- Consistent spacing and typography
- Uses `rounded-lg` for cards

### ✅ Audit Logs Page (`apps/web/src/app/(app)/audit-logs/page.tsx`)
- Uses shared UI components
- Consistent table styling
- Uses `rounded-lg` for cards

### ✅ API Keys Page (`apps/web/src/app/(app)/api-keys/page.tsx`)
- Uses shared UI components
- Consistent modal and card styling
- Uses `rounded-lg` for cards

### ✅ Settings Page (`apps/web/src/app/(app)/settings/page.tsx`)
- Uses shared UI components
- Consistent card and typography styling
- Uses `rounded-lg` for cards

## 🎯 Consistency Standards

### Border Radius
- **Cards**: `rounded-lg` (12px)
- **Buttons**: `rounded-md` (8px) or `rounded-lg` (12px)
- **Inputs**: `rounded-md` (8px)
- **Badges**: `rounded-full`
- **Dropdowns**: `rounded-lg` (12px)

### Shadows
- **Cards**: No shadow (use `variant="bordered"` for border instead)
- **Dropdowns**: `shadow-lg`
- **Modals**: `shadow-xl` (via Modal component)

### Typography
- **Page Titles**: `text-xl font-semibold` or `text-2xl font-semibold`
- **Card Titles**: `text-lg font-semibold`
- **Body Text**: `text-sm` or `text-base`
- **Muted Text**: `text-sm text-muted-foreground`

### Spacing
- **Card Padding**: `p-6` (24px)
- **Section Spacing**: `space-y-6` (24px between sections)
- **Form Fields**: `space-y-2` (8px between label and input)

## 📚 Shared Libraries

### Design System
- **Path**: `libs/shared/design-system/`
- **Exports**: CSS files, Tailwind theme
- **Used By**: `apps/web`, `apps/marketing`

### Motion
- **Path**: `libs/shared/motion/`
- **Exports**: Framer Motion helpers, animation variants
- **Used By**: `apps/web`, `apps/marketing`

### UI Components
- **Path**: `libs/shared/ui/`
- **Exports**: Button, Card, Input, Select, Badge, Table, Modal, etc.
- **Used By**: `apps/web` (marketing uses local components)

## ✅ No Duplicate Token Definitions Found

All design tokens are centralized in `libs/shared/design-system/src/styles/tokens.css`. Both apps import from this single source.

