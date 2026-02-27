# Mobile Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the app feel native on iPhone PWA — fix notch cutoff, add bottom tab navigation, improve text sizes and touch targets.

**Architecture:** New `BottomTabBar` component using existing `useNavigation()` context. Safe area CSS variables already defined in `globals.css` — just need to be applied. Mobile header simplified by removing hamburger nav (replaced by bottom tabs). All changes scoped to mobile breakpoints so desktop is untouched.

**Tech Stack:** React, Tailwind CSS, Lucide icons, existing navigation context

---

### Task 1: Apply Safe Area Insets

The CSS variables `--safe-area-top`, `--safe-area-bottom`, etc. are defined in `globals.css:4-9` but never used. Apply them.

**Files:**
- Modify: `app/page.tsx:225` (root layout div)

**Step 1: Add safe area padding to root container**

In `app/page.tsx`, the root layout div at line 225:

```tsx
<div className="flex h-screen flex-col lg:flex-row overflow-hidden bg-[var(--bg-primary)] theme-transition">
```

Change to:

```tsx
<div className="flex h-screen flex-col lg:flex-row overflow-hidden bg-[var(--bg-primary)] theme-transition" style={{ paddingTop: 'var(--safe-area-top)', paddingLeft: 'var(--safe-area-left)', paddingRight: 'var(--safe-area-right)' }}>
```

Using inline style because Tailwind can't reference CSS env() variables directly.

**Step 2: Verify in browser**

Run: `npm run dev`

Open in Chrome DevTools mobile simulator (iPhone 14 Pro). The header should now clear the notch area. Desktop should be unaffected (env() falls back to 0px).

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "fix: apply safe area insets to root layout for iPhone notch"
```

---

### Task 2: Create BottomTabBar Component

**Files:**
- Create: `components/navigation/BottomTabBar.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { LayoutDashboard, Target, Flag, BookOpen, MoreHorizontal, ListChecks, Timer, Activity, Settings, X } from 'lucide-react'
import { useNavigation } from '@/contexts/NavigationContext'
import { ViewId } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRIMARY_TABS: { id: ViewId | 'more'; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'board', icon: LayoutDashboard, label: 'Home' },
  { id: 'habits', icon: Target, label: 'Habits' },
  { id: 'goals', icon: Flag, label: 'Goals' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'more', icon: MoreHorizontal, label: 'More' },
]

const MORE_ITEMS: { id: ViewId; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'routines', icon: ListChecks, label: 'Routines' },
  { id: 'focus', icon: Timer, label: 'Focus' },
  { id: 'activity', icon: Activity, label: 'Activity' },
]

interface BottomTabBarProps {
  onOpenSettings: () => void
}

export function BottomTabBar({ onOpenSettings }: BottomTabBarProps) {
  const { activeView, setActiveView } = useNavigation()
  const [showMore, setShowMore] = useState(false)

  const isSecondaryActive = MORE_ITEMS.some(item => item.id === activeView)

  const handleTabPress = (id: ViewId | 'more') => {
    if (id === 'more') {
      setShowMore(prev => !prev)
      return
    }
    setShowMore(false)
    setActiveView(id)
  }

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-elevated)] border-t border-[var(--border)] rounded-t-2xl" style={{ paddingBottom: 'calc(60px + var(--safe-area-bottom))' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] font-medium">More</span>
              <button onClick={() => setShowMore(false)} className="p-2 text-[var(--text-tertiary)]">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {MORE_ITEMS.map(item => {
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      setShowMore(false)
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] active:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    <item.icon size={20} />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </button>
                )
              })}
              <button
                onClick={() => {
                  onOpenSettings()
                  setShowMore(false)
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-[var(--text-secondary)] active:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Settings size={20} />
                <span className="text-[13px] font-medium">Settings</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] lg:hidden"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        {PRIMARY_TABS.map(tab => {
          const isMore = tab.id === 'more'
          const isActive = isMore ? (showMore || isSecondaryActive) : activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] transition-colors',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] active:text-[var(--text-secondary)]'
              )}
            >
              <tab.icon size={20} />
              <span className="text-[10px] uppercase tracking-[0.1em] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
```

**Step 2: Verify it renders**

Import and render in `page.tsx` temporarily (will integrate fully in Task 3). Check in DevTools mobile view — should see tab bar fixed to bottom with safe area padding.

**Step 3: Commit**

```bash
git add components/navigation/BottomTabBar.tsx
git commit -m "feat: add BottomTabBar component for mobile navigation"
```

---

### Task 3: Integrate BottomTabBar and Remove Hamburger Nav

**Files:**
- Modify: `app/page.tsx:17,30,87,225-253,288`

**Step 1: Add import**

In `app/page.tsx`, add to imports (around line 17):

```tsx
import { BottomTabBar } from '@/components/navigation/BottomTabBar'
```

**Step 2: Remove hamburger menu state and imports**

Remove from line 17:
```tsx
import { MainNav, MobileNav } from '@/components/navigation/MainNav'
```
Replace with:
```tsx
import { MainNav } from '@/components/navigation/MainNav'
```

Remove from line 30:
```tsx
import { Menu, X } from 'lucide-react'
```

Remove `showMobileNav` state (line 87):
```tsx
const [showMobileNav, setShowMobileNav] = useState(false)
```

**Step 3: Simplify the mobile header**

In `page.tsx`, the header section (lines 229-253). Replace the entire `<header>` and mobile nav dropdown with:

```tsx
<header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-[var(--border-subtle)] theme-transition">
  <div className="flex items-center gap-4 sm:gap-6">
    <h1 className="font-display text-xl tracking-tight text-[var(--text-primary)]">
      <span className="italic">Vibe</span>
      <span className="text-[var(--accent)]">Board</span>
    </h1>
    <MainNav className="hidden lg:flex" />
  </div>

  <div />
</header>
```

This removes the hamburger button and the `showMobileNav && <MobileNav>` block entirely.

**Step 4: Add BottomTabBar and content padding**

After `</main>` (around line 288) and before `<Sidebar>`, add:

```tsx
<BottomTabBar onOpenSettings={() => setShowSettings(true)} />
```

On the `<main>` tag (line 227), add bottom padding for the tab bar:

```tsx
<main className="flex-1 flex flex-col overflow-hidden min-h-0 pb-[60px] lg:pb-0">
```

**Step 5: Verify**

- Mobile: Bottom tab bar visible, hamburger menu gone, content doesn't hide behind tabs
- Desktop (lg+): No bottom tab bar, MainNav still in header, no bottom padding
- Navigate between views using tabs — should work identically to old nav

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate bottom tab bar and remove hamburger nav on mobile"
```

---

### Task 4: Mobile Touch Target Improvements

Increase tap areas on key mobile interactive elements to meet 44px minimum.

**Files:**
- Modify: `components/Header.tsx:279-358` (mobile controls buttons)
- Modify: `components/kanban/Board.tsx:394` (mobile column tabs)

**Step 1: Header mobile controls — increase button padding**

In `Header.tsx`, the mobile controls button (line 282):

```tsx
className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] ...
```

Change to:

```tsx
className="flex items-center gap-2 px-3 py-2.5 text-[12px] ...
```

The grid buttons inside (lines 302-354) — change all instances of `py-2` to `py-3` for the mobile control buttons.

**Step 2: Board mobile column tabs**

In `Board.tsx` line 394, the sticky mobile column selector has small tap targets. Check the buttons inside and ensure they have at least `py-2.5 px-3` padding.

**Step 3: Verify**

Tap targets should feel comfortable on mobile. Check: header controls button, filter/sort dropdowns, board column tabs.

**Step 4: Commit**

```bash
git add components/Header.tsx components/kanban/Board.tsx
git commit -m "fix: increase mobile touch targets to meet 44px minimum"
```

---

### Task 5: Mobile Typography Bump

Increase base text sizes on mobile for readability.

**Files:**
- Modify: `components/Header.tsx` (mobile controls text)
- Modify: `components/kanban/Board.tsx` (card text, column headers)
- Modify: `components/habits/HabitsPage.tsx` (habit card text)
- Modify: `components/goals/GoalsPage.tsx` (goal text)
- Modify: `components/journal/JournalPage.tsx` (journal entry text)

**Step 1: Identify and update key text elements**

The pattern: where you see `text-[11px]`, change to `text-[12px] sm:text-[11px]`. Where `text-[12px]`, change to `text-[13px] sm:text-[12px]`. Where `text-[13px]`, change to `text-[14px] sm:text-[13px]`.

Focus on content text that users read — card titles, habit names, goal names, journal entries. Skip decorative/label text that's already fine.

This is a multi-file sweep. Be selective — only bump sizes on elements that are hard to read at current sizes. Don't change icon sizes or spacing.

**Step 2: Verify**

Check each view on mobile. Text should be noticeably more readable without looking oversized. Desktop should be unchanged (the `sm:` prefix restores original sizes).

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: bump mobile text sizes for readability"
```

---

### Task 6: Clean Up Dead Mobile Nav Code

Remove `MobileNav` export from `MainNav.tsx` since it's no longer used.

**Files:**
- Modify: `components/navigation/MainNav.tsx:66-99`

**Step 1: Remove MobileNav component**

Delete the `MobileNav` function (lines 66-99) from `MainNav.tsx`.

**Step 2: Verify no remaining imports**

Search for any remaining `MobileNav` imports across the codebase. There should be none after Task 3.

**Step 3: Commit**

```bash
git add components/navigation/MainNav.tsx
git commit -m "refactor: remove unused MobileNav component"
```

---

### Task 7: Final Verification

**Step 1: Full mobile walkthrough**

Test on mobile (or DevTools iPhone simulator):
- [ ] App clears notch/Dynamic Island
- [ ] Bottom tab bar visible with 5 tabs
- [ ] All 4 primary tabs navigate correctly
- [ ] "More" opens sheet with Routines, Focus, Activity, Settings
- [ ] Settings opens from More menu
- [ ] Content doesn't hide behind tab bar
- [ ] Text is readable
- [ ] Touch targets feel comfortable
- [ ] No hamburger menu anywhere

**Step 2: Desktop regression check**

Test on desktop (lg+ width):
- [ ] No bottom tab bar visible
- [ ] MainNav still in header
- [ ] No extra padding at bottom
- [ ] Everything works as before

**Step 3: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat: complete mobile optimization — bottom tabs, safe areas, typography"
```
