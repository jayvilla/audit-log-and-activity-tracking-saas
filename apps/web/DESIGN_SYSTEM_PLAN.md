# Linear.app-Inspired Design System Plan

## Executive Summary

This document outlines a comprehensive plan to restyle the `apps/web` dashboard to a Linear.app-inspired design system. The approach prioritizes incremental migration, accessibility, and maintaining business logic integrity while transforming the UI layer.

---

## 1. New UI Architecture

### Folder Structure

```
apps/web/src/
├── app/                          # Next.js App Router (existing)
│   ├── (auth)/                   # Auth routes group
│   │   └── login/
│   ├── (dashboard)/              # Dashboard routes group
│   │   ├── audit-logs/
│   │   └── layout.tsx            # Dashboard layout wrapper
│   └── layout.tsx                # Root layout
│
├── components/                   # Component library
│   ├── ui/                       # Primitive components (client)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── dropdown.tsx
│   │   ├── modal.tsx
│   │   ├── toast.tsx
│   │   └── index.ts
│   │
│   ├── layout/                   # Layout components
│   │   ├── app-shell.tsx         # Main dashboard shell
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   ├── topbar.tsx            # Top navigation bar
│   │   └── sidebar-nav-item.tsx  # Sidebar navigation item
│   │
│   └── features/                 # Feature-specific components
│       ├── audit-logs/
│       │   ├── audit-log-filters.tsx
│       │   ├── audit-log-table.tsx
│       │   └── audit-log-export-menu.tsx
│       └── auth/
│           └── login-form.tsx
│
├── lib/
│   ├── api-client.ts             # Existing API client
│   └── design-tokens.ts          # Token utilities/helpers
│
└── styles/
    └── tokens.css                # CSS custom properties (design tokens)
```

### Component Organization Principles

- **UI Primitives** (`components/ui/`): Reusable, accessible, client components
- **Layout Components** (`components/layout/`): AppShell, Sidebar, Topbar (client components)
- **Feature Components** (`components/features/`): Business logic components (can be server or client)
- **Server Components**: Prefer server components for data fetching; wrap with client components for interactivity

---

## 2. Tokens + Theming Approach

### CSS Variables (Design Tokens)

**File: `apps/web/src/styles/tokens.css`**

```css
:root {
  /* Colors - Linear-inspired palette */
  --color-bg-primary: #0d0d0d;
  --color-bg-secondary: #161616;
  --color-bg-tertiary: #1f1f1f;
  --color-bg-elevated: #262626;
  --color-bg-hover: #2a2a2a;
  --color-bg-active: #333333;
  
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-default: rgba(255, 255, 255, 0.12);
  --color-border-strong: rgba(255, 255, 255, 0.16);
  
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-tertiary: rgba(255, 255, 255, 0.5);
  --color-text-disabled: rgba(255, 255, 255, 0.3);
  
  --color-accent-primary: #5e6ad2;
  --color-accent-primary-hover: #6b77e0;
  --color-accent-primary-active: #525cc4;
  
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  
  /* Spacing - 4px grid */
  --spacing-0: 0;
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */
  
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Shadows - Linear's subtle elevation */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  
  /* Border Radius */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 100ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Z-index scale */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}

/* Light mode (optional, for future) */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f9fafb;
    --color-bg-tertiary: #f3f4f6;
    --color-bg-elevated: #ffffff;
    --color-bg-hover: #f3f4f6;
    --color-bg-active: #e5e7eb;
    
    --color-border-subtle: rgba(0, 0, 0, 0.06);
    --color-border-default: rgba(0, 0, 0, 0.1);
    --color-border-strong: rgba(0, 0, 0, 0.15);
    
    --color-text-primary: #111827;
    --color-text-secondary: rgba(0, 0, 0, 0.7);
    --color-text-tertiary: rgba(0, 0, 0, 0.5);
    --color-text-disabled: rgba(0, 0, 0, 0.3);
  }
}
```

### Tailwind Configuration

**File: `apps/web/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          elevated: 'var(--color-bg-elevated)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          default: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          'primary-hover': 'var(--color-accent-primary-hover)',
          'primary-active': 'var(--color-accent-primary-active)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-tight)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
        xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
      },
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
};
```

### Usage Pattern

- **Never use arbitrary values**: `bg-[#fff]` ❌ → `bg-primary` ✅
- **Use semantic tokens**: `text-slate-600` ❌ → `text-secondary` ✅
- **Consistent spacing**: Always use spacing scale (multiples of 4px)

---

## 3. Component Primitives List

### 3.1 Button (`components/ui/button.tsx`)

**Variants:**
- `primary` - Main action (accent color)
- `secondary` - Secondary action (subtle background)
- `ghost` - Text-only button
- `danger` - Destructive action

**Sizes:**
- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height

**Features:**
- Focus-visible ring
- Loading state
- Disabled state
- Icon support (left/right)
- Full keyboard navigation

### 3.2 Card (`components/ui/card.tsx`)

**Variants:**
- `default` - Standard elevated surface
- `bordered` - With border instead of shadow
- `flat` - No elevation

**Features:**
- Optional header/footer sections
- Padding variants

### 3.3 Input (`components/ui/input.tsx`)

**Types:**
- `text`, `email`, `password`, `number`, `date`, `datetime-local`

**Features:**
- Label support
- Error state with message
- Helper text
- Icon support (left/right)
- Full ARIA attributes

### 3.4 Select (`components/ui/select.tsx`)

**Features:**
- Native select with custom styling
- Multi-select variant (future)
- Searchable variant (future)
- Full keyboard navigation

### 3.5 Badge (`components/ui/badge.tsx`)

**Variants:**
- `default` - Neutral
- `success` - Green
- `warning` - Yellow
- `error` - Red
- `info` - Blue
- `accent` - Primary accent color

**Sizes:**
- `sm` - Small
- `md` - Medium (default)

### 3.6 Table (`components/ui/table.tsx`)

**Features:**
- Sortable columns
- Row selection
- Expandable rows
- Virtual scrolling support (via @tanstack/react-virtual)
- Responsive design
- Full keyboard navigation

### 3.7 Dropdown (`components/ui/dropdown.tsx`)

**Features:**
- Trigger button/icon
- Menu items with icons
- Dividers
- Keyboard navigation (arrow keys, Enter, Escape)
- Click outside to close
- Focus trap

### 3.8 Modal (`components/ui/modal.tsx`)

**Features:**
- Backdrop with click-to-close
- Focus trap
- Escape key to close
- Size variants (sm, md, lg, xl)
- Optional header/footer
- Portal rendering

### 3.9 Toast (`components/ui/toast.tsx`)

**Features:**
- Toast provider/context
- Auto-dismiss with configurable duration
- Manual dismiss
- Variants: success, error, warning, info
- Stack multiple toasts
- Animations (slide in/out)

---

## 4. Layout Structure

### 4.1 AppShell (`components/layout/app-shell.tsx`)

**Structure:**
```
┌─────────────────────────────────────┐
│ Topbar (fixed)                      │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │ Main Content Area       │
│ (fixed)  │ (scrollable)             │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Features:**
- Responsive sidebar (collapsible on mobile)
- Fixed topbar with user menu, search (future)
- Main content area with proper padding
- Smooth transitions

### 4.2 Sidebar (`components/layout/sidebar.tsx`)

**Navigation Items:**
- Dashboard (home)
- Audit Logs
- Webhooks (future)
- API Keys (future)
- Settings (future)

**Features:**
- Active route highlighting
- Icon + label
- Collapsible on mobile
- Smooth transitions

### 4.3 Topbar (`components/layout/topbar.tsx`)

**Elements:**
- Logo/Brand (left)
- Search bar (center, future)
- User menu dropdown (right)
  - Profile
  - Settings
  - Logout

**Features:**
- Sticky positioning
- User avatar/initials
- Dropdown menu

---

## 5. Migration Plan

### Phase 1: Foundation (Week 1)
**Goal:** Set up design tokens and basic structure

1. ✅ Create `styles/tokens.css` with CSS variables
2. ✅ Update `tailwind.config.js` with token mappings
3. ✅ Import tokens in `app/global.css`
4. ✅ Create folder structure (`components/ui/`, `components/layout/`)
5. ✅ Update root layout to use dark background

**Deliverables:**
- Design tokens file
- Updated Tailwind config
- Folder structure in place

**Risk:** Low - No breaking changes

---

### Phase 2: Component Primitives (Week 2)
**Goal:** Build all UI primitives

1. ✅ Implement Button component
2. ✅ Implement Card component
3. ✅ Implement Input component
4. ✅ Implement Select component
5. ✅ Implement Badge component
6. ✅ Implement Table component (basic)
7. ✅ Implement Dropdown component
8. ✅ Implement Modal component
9. ✅ Implement Toast component

**Deliverables:**
- All 9 primitive components
- Storybook/docs (optional)
- Accessibility testing

**Risk:** Low - New components, no existing code changes

---

### Phase 3: Layout System (Week 3)
**Goal:** Build AppShell and navigation

1. ✅ Create AppShell component
2. ✅ Create Sidebar component
3. ✅ Create Topbar component
4. ✅ Create SidebarNavItem component
5. ✅ Create dashboard layout wrapper (`app/(dashboard)/layout.tsx`)
6. ✅ Test responsive behavior

**Deliverables:**
- Complete layout system
- Navigation working
- Responsive design

**Risk:** Medium - Requires route group changes

---

### Phase 4: Login Page Migration (Week 3-4)
**Goal:** Migrate login page to new design system

1. ✅ Create LoginForm component (feature component)
2. ✅ Update `app/login/page.tsx` to use new components
3. ✅ Apply Linear-inspired styling
4. ✅ Test accessibility

**Deliverables:**
- Redesigned login page
- Using new component primitives

**Risk:** Low - Isolated page, easy to test

---

### Phase 5: Audit Logs Page Migration (Week 4-5)
**Goal:** Migrate audit logs page incrementally

**Step 5.1: Filters Section**
1. ✅ Create AuditLogFilters component
2. ✅ Replace filter inputs with new Input/Select components
3. ✅ Apply new styling

**Step 5.2: Table Section**
1. ✅ Create AuditLogTable component
2. ✅ Replace table with new Table component
3. ✅ Maintain virtualization (@tanstack/react-virtual)
4. ✅ Apply new styling

**Step 5.3: Export & Actions**
1. ✅ Create AuditLogExportMenu component
2. ✅ Replace export dropdown with new Dropdown component
3. ✅ Apply new styling

**Step 5.4: Layout Integration**
1. ✅ Wrap page in AppShell
2. ✅ Update navigation
3. ✅ Test full flow

**Deliverables:**
- Fully migrated audit logs page
- All functionality preserved
- New Linear-inspired design

**Risk:** Medium - Complex page with many interactions

---

### Phase 6: Polish & Testing (Week 5-6)
**Goal:** Final touches and comprehensive testing

1. ✅ Accessibility audit (keyboard, screen readers, focus states)
2. ✅ Performance testing (virtual scrolling, animations)
3. ✅ Cross-browser testing
4. ✅ Mobile responsiveness testing
5. ✅ Fix any bugs or inconsistencies
6. ✅ Update documentation

**Deliverables:**
- Fully tested and polished UI
- Accessibility compliant
- Performance optimized

**Risk:** Low - Testing and refinement phase

---

## 6. Implementation Guidelines

### Accessibility Requirements

1. **Keyboard Navigation:**
   - All interactive elements must be keyboard accessible
   - Tab order must be logical
   - Focus indicators must be visible
   - Escape key closes modals/dropdowns

2. **ARIA Attributes:**
   - Proper `role` attributes
   - `aria-label` for icon-only buttons
   - `aria-expanded` for dropdowns
   - `aria-live` for toast notifications

3. **Focus Management:**
   - Focus trap in modals
   - Focus return after closing modals
   - Visible focus rings (not removed)

4. **Screen Readers:**
   - Semantic HTML
   - Descriptive labels
   - Status announcements

### Performance Considerations

1. **Code Splitting:**
   - Lazy load heavy components (Modal, Toast)
   - Route-based code splitting

2. **Virtualization:**
   - Maintain @tanstack/react-virtual for large tables
   - Optimize row rendering

3. **Animations:**
   - Use CSS transitions (prefer over JS animations)
   - Respect `prefers-reduced-motion`

### Testing Strategy

1. **Component Tests:**
   - Unit tests for each primitive component
   - Test accessibility attributes
   - Test keyboard interactions

2. **Integration Tests:**
   - Test page flows
   - Test form submissions
   - Test navigation

3. **E2E Tests:**
   - Critical user flows
   - Cross-browser testing

---

## 7. Success Criteria

### Visual
- ✅ Consistent Linear.app-inspired aesthetic
- ✅ Smooth animations and transitions
- ✅ Proper spacing and typography
- ✅ Dark mode (primary) with light mode support

### Functional
- ✅ All existing functionality preserved
- ✅ No breaking changes to business logic
- ✅ Performance maintained or improved

### Accessibility
- ✅ WCAG 2.1 AA compliance
- ✅ Full keyboard navigation
- ✅ Screen reader compatible
- ✅ Focus management working

### Code Quality
- ✅ TypeScript strict mode
- ✅ No `any` types
- ✅ Reusable component primitives
- ✅ Consistent code style

---

## 8. Future Enhancements

1. **Light Mode Toggle:** User preference switcher
2. **Search:** Global search in topbar
3. **Command Palette:** Cmd+K quick actions
4. **Themes:** Custom accent colors
5. **Animations:** More micro-interactions
6. **Component Library:** Storybook documentation

---

## 9. Rollback Plan

If critical issues arise:

1. **Component Level:** Revert individual component changes
2. **Page Level:** Keep old page version in backup branch
3. **Full Rollback:** Git revert to pre-migration state

**Mitigation:**
- Incremental migration reduces risk
- Feature flags for new components (optional)
- Comprehensive testing before each phase

---

## Appendix: Linear.app Design Principles

1. **Minimalism:** Clean, uncluttered interfaces
2. **Subtle Depth:** Soft shadows, not heavy borders
3. **Typography:** Clear hierarchy, readable fonts
4. **Color:** Muted palette with strategic accent colors
5. **Motion:** Smooth, purposeful animations
6. **Consistency:** Same patterns throughout
7. **Accessibility:** Built-in, not an afterthought

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Ready for Implementation

