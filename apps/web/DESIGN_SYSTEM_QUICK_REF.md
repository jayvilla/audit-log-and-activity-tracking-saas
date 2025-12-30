# Linear.app Design System - Quick Reference

## 🎨 Design Tokens

### Colors
- **Backgrounds:** `bg-primary`, `bg-secondary`, `bg-elevated`, `bg-hover`
- **Borders:** `border-subtle`, `border-default`, `border-strong`
- **Text:** `text-primary`, `text-secondary`, `text-tertiary`
- **Accent:** `accent-primary`, `accent-primary-hover`

### Spacing
- Use 4px grid: `p-4`, `gap-2`, `m-8` (multiples of 4px)

### Typography
- Font: System sans-serif stack
- Sizes: `text-xs` (12px) → `text-3xl` (30px)
- Weights: `font-normal` (400), `font-medium` (500), `font-semibold` (600)

## 🧩 Component Primitives

| Component | Variants | Key Features |
|-----------|----------|--------------|
| **Button** | primary, secondary, ghost, danger | Sizes: sm/md/lg, loading, disabled, icons |
| **Card** | default, bordered, flat | Header/footer sections, padding variants |
| **Input** | text, email, password, etc. | Label, error state, helper text, icons |
| **Select** | single, multi (future) | Native with custom styling, keyboard nav |
| **Badge** | default, success, warning, error, info, accent | Sizes: sm/md |
| **Table** | sortable, selectable, expandable | Virtual scrolling, keyboard nav |
| **Dropdown** | menu items, dividers | Keyboard nav, click outside, focus trap |
| **Modal** | sm, md, lg, xl | Backdrop, focus trap, escape key |
| **Toast** | success, error, warning, info | Auto-dismiss, stack, animations |

## 📐 Layout Structure

```
AppShell
├── Topbar (fixed)
│   ├── Logo
│   ├── Search (future)
│   └── User Menu
├── Sidebar (fixed)
│   ├── Dashboard
│   ├── Audit Logs
│   └── Settings (future)
└── Main Content (scrollable)
```

## 🚀 Migration Phases

1. **Foundation** - Tokens + Tailwind config
2. **Primitives** - Build all 9 UI components
3. **Layout** - AppShell, Sidebar, Topbar
4. **Login** - Migrate login page
5. **Audit Logs** - Migrate filters, table, export
6. **Polish** - Testing, accessibility, performance

## ✅ Usage Rules

### DO ✅
- Use semantic tokens: `bg-primary` not `bg-[#000]`
- Follow 4px spacing grid
- Use component primitives
- Maintain accessibility (keyboard, ARIA)
- Prefer server components for data fetching

### DON'T ❌
- Use arbitrary values: `bg-[#fff]`
- Use literal colors: `text-slate-600`
- Skip accessibility features
- Mix old and new styles in same component
- Break existing business logic

## 📁 File Structure

```
src/
├── components/
│   ├── ui/          # Primitives (Button, Card, etc.)
│   ├── layout/      # AppShell, Sidebar, Topbar
│   └── features/    # Feature-specific components
├── styles/
│   └── tokens.css   # CSS custom properties
└── app/
    ├── (auth)/      # Auth routes
    └── (dashboard)/ # Dashboard routes
```

## 🎯 Key Principles

1. **Minimalism** - Clean, uncluttered
2. **Subtle Depth** - Soft shadows, not heavy borders
3. **Consistency** - Same patterns throughout
4. **Accessibility** - Built-in, not afterthought
5. **Performance** - Smooth animations, optimized

---

**See `DESIGN_SYSTEM_PLAN.md` for full details.**

