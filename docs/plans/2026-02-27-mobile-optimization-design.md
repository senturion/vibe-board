# Mobile Optimization Design

## Problem

The app is not optimized for mobile (iPhone PWA). Specific issues:
- Header/nav cut off by the notch/Dynamic Island — safe area insets are defined in CSS but never applied
- Text too small at fixed 11-13px sizes
- Touch targets too small for comfortable tapping
- Navigation requires hamburger menu at top of screen — hidden, awkward to reach one-handed

## Approach

Bottom tab navigation + safe area fixes + mobile typography/touch target improvements. Stays within the existing layout architecture — no structural redesign.

## Design

### 1. Bottom Tab Bar

New `BottomTabBar` component, visible only on mobile (hidden `lg:` and up).

**Tabs (5):**
| Tab | ViewId | Icon | Label |
|-----|--------|------|-------|
| Home | `board` | `LayoutDashboard` | Home |
| Habits | `habits` | `Target` | Habits |
| Goals | `goals` | `Flag` | Goals |
| Journal | `journal` | `BookOpen` | Journal |
| More | — | `MoreHorizontal` | More |

**"More" menu** opens an overlay/sheet with:
- Routines
- Focus
- Activity
- Settings (links to settings view)

**Behavior:**
- Fixed to bottom of viewport
- Respects `--safe-area-bottom` for home indicator clearance
- Active tab shows accent color, others show `--text-tertiary`
- Icon (20px) above label (`text-[10px]`, `tracking-[0.1em]`, uppercase)
- Tapping active tab scrolls to top (standard iOS convention)
- Uses existing `useNavigation()` context — no new state management

### 2. Safe Area Insets

Apply the already-defined CSS variables:

- **Top:** `padding-top: var(--safe-area-top)` on the root layout container (the `flex h-screen` div in `page.tsx`). This pushes the header below the notch.
- **Bottom:** `padding-bottom: var(--safe-area-bottom)` on the bottom tab bar. This pushes tabs above the home indicator.
- **Left/Right:** `padding-left: var(--safe-area-left)` and `padding-right: var(--safe-area-right)` on the main content area for landscape orientation.

### 3. Mobile Typography & Touch Targets

**Text size bumps at mobile (below `sm:` breakpoint):**
- `text-[11px]` base → `text-[12px]`
- `text-[12px]` base → `text-[13px]`
- `text-[13px]` base → `text-[14px]`

Applied to key components: nav labels, card content, form labels, button text.

**Touch targets:**
- All interactive elements enforce 44x44px minimum tap area on mobile
- Achieved via padding increases on buttons, card actions, form controls
- Key areas: header action buttons, card action icons, kanban card tap areas, habit completion buttons

### 4. Mobile Header Simplification

With navigation in the bottom tab bar, the mobile header changes:

**Remove:**
- Hamburger menu button
- `MobileNav` dropdown component (on mobile)

**Keep:**
- Section/board title (left-aligned)
- Contextual actions: filter, sort, search (right-aligned)
- Settings gear

This reclaims vertical space and eliminates the two-tap navigation pattern.

### 5. Layout Adjustments

**Main content area** needs `pb-[60px] lg:pb-0` (or similar) to prevent content from being hidden behind the fixed bottom tab bar.

**Kanban board** horizontal scroll area needs bottom padding adjustment so the last row of cards isn't obscured.

## Scope Exclusions

- No sidebar/widget changes on mobile (sidebar stays hidden on mobile)
- No landscape-specific layouts beyond safe area insets
- No pull-to-refresh or gesture navigation
- No changes to desktop layout
