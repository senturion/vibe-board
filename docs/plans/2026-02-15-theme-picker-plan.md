# Theme Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the binary dark/light toggle with an 8-theme picker using color dot grid UI, with per-theme font pairings.

**Architecture:** CSS custom properties define each theme via `[data-theme="id"]` selectors in `globals.css`. A TypeScript registry (`lib/themes.ts`) maps theme IDs to display metadata. The `useTheme` hook is updated to support any theme ID. Font loading via `next/font/google` in `layout.tsx`.

**Tech Stack:** Next.js, CSS custom properties, next/font/google, Supabase (user_settings.theme column — already `text` type, no migration needed), localStorage.

---

### Task 1: Create Theme Registry

**Files:**
- Create: `lib/themes.ts`

**Step 1: Create the theme registry file**

```typescript
export type ThemeId = 'ember' | 'sand' | 'midnight' | 'forest' | 'nord' | 'mono' | 'ocean' | 'paper'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  type: 'dark' | 'light'
  colors: { bg: string; accent: string }
}

export const THEMES: ThemeDefinition[] = [
  { id: 'ember',    name: 'Ember',    type: 'dark',  colors: { bg: '#0c0b0a', accent: '#e07a5f' } },
  { id: 'sand',     name: 'Sand',     type: 'light', colors: { bg: '#faf8f5', accent: '#d4694e' } },
  { id: 'midnight', name: 'Midnight', type: 'dark',  colors: { bg: '#0a0e1a', accent: '#6c8aec' } },
  { id: 'forest',   name: 'Forest',   type: 'dark',  colors: { bg: '#0b120d', accent: '#c4a35a' } },
  { id: 'nord',     name: 'Nord',     type: 'dark',  colors: { bg: '#1a1e2e', accent: '#88c0d0' } },
  { id: 'mono',     name: 'Mono',     type: 'dark',  colors: { bg: '#111111', accent: '#ffffff' } },
  { id: 'ocean',    name: 'Ocean',    type: 'dark',  colors: { bg: '#0a1419', accent: '#4db8a4' } },
  { id: 'paper',    name: 'Paper',    type: 'light', colors: { bg: '#f4f1ec', accent: '#2d2d2d' } },
]

export const DEFAULT_DARK_THEME: ThemeId = 'ember'
export const DEFAULT_LIGHT_THEME: ThemeId = 'sand'

export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find(t => t.id === id)
}

export function isValidThemeId(id: string): id is ThemeId {
  return THEMES.some(t => t.id === id)
}

/** Map legacy 'dark'/'light' values to new theme IDs */
export function migrateLegacyTheme(value: string): ThemeId {
  if (value === 'dark') return 'ember'
  if (value === 'light') return 'sand'
  if (isValidThemeId(value)) return value
  return DEFAULT_DARK_THEME
}
```

**Step 2: Commit**

```bash
git add lib/themes.ts
git commit -m "feat: add theme registry with 8 theme definitions"
```

---

### Task 2: Add Font Loading

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add new font imports and variables**

Add 4 new font imports alongside the existing `Instrument_Serif` and `DM_Sans`:

```typescript
import { Instrument_Serif, DM_Sans, Inter, JetBrains_Mono, Playfair_Display, Source_Serif_4 } from "next/font/google";
```

Add font instances after the existing `fontBody`:

```typescript
const fontInter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const fontSourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});
```

Update the `<body>` className to include all font variables:

```tsx
<body className={`${fontDisplay.variable} ${fontBody.variable} ${fontInter.variable} ${fontMono.variable} ${fontPlayfair.variable} ${fontSourceSerif.variable} antialiased`}>
```

**Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: load additional theme fonts (Inter, JetBrains Mono, Playfair, Source Serif)"
```

---

### Task 3: Add CSS Theme Definitions

**Files:**
- Modify: `app/globals.css`

**Step 1: Rename existing `:root` theme to `[data-theme="ember"]` pattern**

The `:root` block stays as-is (it serves as the default/ember theme). Rename the `[data-theme="light"]` selector to `[data-theme="sand"]`.

Change line 89:
```css
/* Old: */
[data-theme="light"] {
/* New: */
[data-theme="sand"] {
```

Also update line 199:
```css
/* Old: */
[data-theme="light"] body::before {
/* New: */
[data-theme="sand"] body::before,
[data-theme="paper"] body::before {
```

**Step 2: Add 6 new theme blocks after the `[data-theme="sand"]` block (after line 155)**

Each theme block follows the same variable structure. Insert these blocks between the sand theme block and the `@theme inline` block.

Midnight theme:
```css
/* Midnight - Deep cool focus */
[data-theme="midnight"] {
  --bg-primary: #0a0e1a;
  --bg-secondary: #111827;
  --bg-tertiary: #1e2536;
  --bg-elevated: #252d40;

  --border: #2a3348;
  --border-subtle: #1e2a3e;

  --text-primary: #e8ecf4;
  --text-secondary: #8892a8;
  --text-tertiary: #4f5b73;

  --accent: #6c8aec;
  --accent-muted: #5a75d4;
  --accent-glow: rgba(108, 138, 236, 0.15);

  --success: #6cc0a1;
  --complete: #3d4f7c;

  --chart-1: #6c8aec;
  --chart-2: #6cc0a1;
  --chart-3: #c084fc;
  --chart-4: #f0b866;
  --chart-5: #67c5d0;

  --habit-complete: var(--success);
  --habit-partial: #f0b866;
  --habit-missed: #e0736a;

  --focus-work: var(--accent);
  --focus-break: var(--success);
  --focus-long-break: #6cc0a1;

  --goal-progress: var(--chart-2);
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: var(--success);

  --journal-mood-1: #ef4444;
  --journal-mood-2: #f97316;
  --journal-mood-3: #eab308;
  --journal-mood-4: #94a3b8;
  --journal-mood-5: #84cc16;
  --journal-mood-6: #22c55e;
  --journal-mood-7: #c084fc;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(108, 192, 161, 0.25);
  --heatmap-2: rgba(108, 192, 161, 0.5);
  --heatmap-3: rgba(108, 192, 161, 0.75);
  --heatmap-4: var(--success);
}
```

Forest theme:
```css
/* Forest - Rich natural greens & amber */
[data-theme="forest"] {
  --bg-primary: #0b120d;
  --bg-secondary: #141f16;
  --bg-tertiary: #1d2b20;
  --bg-elevated: #253528;

  --border: #2e3d30;
  --border-subtle: #223026;

  --text-primary: #e4ebe5;
  --text-secondary: #8a9a8c;
  --text-tertiary: #556857;

  --accent: #c4a35a;
  --accent-muted: #b0923f;
  --accent-glow: rgba(196, 163, 90, 0.15);

  --success: #6aab7d;
  --complete: #3d5b42;

  --chart-1: #c4a35a;
  --chart-2: #6aab7d;
  --chart-3: #d4826a;
  --chart-4: #8fbb6a;
  --chart-5: #7ab5a0;

  --habit-complete: var(--success);
  --habit-partial: #c4a35a;
  --habit-missed: #d4826a;

  --focus-work: var(--accent);
  --focus-break: var(--success);
  --focus-long-break: #6aab7d;

  --goal-progress: var(--chart-2);
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: var(--success);

  --journal-mood-1: #d4564a;
  --journal-mood-2: #d4826a;
  --journal-mood-3: #c4a35a;
  --journal-mood-4: #8a9a8c;
  --journal-mood-5: #8fbb6a;
  --journal-mood-6: #6aab7d;
  --journal-mood-7: #c084a0;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(106, 171, 125, 0.25);
  --heatmap-2: rgba(106, 171, 125, 0.5);
  --heatmap-3: rgba(106, 171, 125, 0.75);
  --heatmap-4: var(--success);
}
```

Nord theme (with font overrides):
```css
/* Nord - Arctic muted */
[data-theme="nord"] {
  --bg-primary: #1a1e2e;
  --bg-secondary: #222738;
  --bg-tertiary: #2e3446;
  --bg-elevated: #353c50;

  --border: #3e4660;
  --border-subtle: #313854;

  --text-primary: #eceff4;
  --text-secondary: #8890a4;
  --text-tertiary: #5a6378;

  --accent: #88c0d0;
  --accent-muted: #72a8b8;
  --accent-glow: rgba(136, 192, 208, 0.15);

  --success: #a3be8c;
  --complete: #4c566a;

  --chart-1: #88c0d0;
  --chart-2: #a3be8c;
  --chart-3: #b48ead;
  --chart-4: #ebcb8b;
  --chart-5: #81a1c1;

  --habit-complete: var(--success);
  --habit-partial: #ebcb8b;
  --habit-missed: #bf616a;

  --focus-work: var(--accent);
  --focus-break: var(--success);
  --focus-long-break: #a3be8c;

  --goal-progress: var(--chart-2);
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: var(--success);

  --journal-mood-1: #bf616a;
  --journal-mood-2: #d08770;
  --journal-mood-3: #ebcb8b;
  --journal-mood-4: #8890a4;
  --journal-mood-5: #a3be8c;
  --journal-mood-6: #88c0d0;
  --journal-mood-7: #b48ead;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(163, 190, 140, 0.25);
  --heatmap-2: rgba(163, 190, 140, 0.5);
  --heatmap-3: rgba(163, 190, 140, 0.75);
  --heatmap-4: var(--success);

  --font-display: var(--font-inter), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
}
```

Mono theme (with font overrides):
```css
/* Mono - Clean minimal */
[data-theme="mono"] {
  --bg-primary: #111111;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #222222;
  --bg-elevated: #2a2a2a;

  --border: #333333;
  --border-subtle: #282828;

  --text-primary: #e5e5e5;
  --text-secondary: #888888;
  --text-tertiary: #555555;

  --accent: #ffffff;
  --accent-muted: #cccccc;
  --accent-glow: rgba(255, 255, 255, 0.08);

  --success: #888888;
  --complete: #333333;

  --chart-1: #ffffff;
  --chart-2: #aaaaaa;
  --chart-3: #666666;
  --chart-4: #cccccc;
  --chart-5: #888888;

  --habit-complete: #aaaaaa;
  --habit-partial: #666666;
  --habit-missed: #444444;

  --focus-work: var(--accent);
  --focus-break: #888888;
  --focus-long-break: #888888;

  --goal-progress: #aaaaaa;
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: #aaaaaa;

  --journal-mood-1: #e5e5e5;
  --journal-mood-2: #cccccc;
  --journal-mood-3: #aaaaaa;
  --journal-mood-4: #888888;
  --journal-mood-5: #999999;
  --journal-mood-6: #bbbbbb;
  --journal-mood-7: #dddddd;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(170, 170, 170, 0.2);
  --heatmap-2: rgba(170, 170, 170, 0.4);
  --heatmap-3: rgba(170, 170, 170, 0.6);
  --heatmap-4: #aaaaaa;

  --font-display: var(--font-mono), 'Courier New', monospace;
  --font-body: var(--font-mono), 'Courier New', monospace;
}
```

Ocean theme:
```css
/* Ocean - Deep sea calm */
[data-theme="ocean"] {
  --bg-primary: #0a1419;
  --bg-secondary: #111f26;
  --bg-tertiary: #1a2d36;
  --bg-elevated: #223842;

  --border: #2a4250;
  --border-subtle: #1e3540;

  --text-primary: #e0eef2;
  --text-secondary: #7a9eaa;
  --text-tertiary: #4a6e7c;

  --accent: #4db8a4;
  --accent-muted: #3da08e;
  --accent-glow: rgba(77, 184, 164, 0.15);

  --success: #68c4a0;
  --complete: #2a5060;

  --chart-1: #4db8a4;
  --chart-2: #68c4a0;
  --chart-3: #6a9fd4;
  --chart-4: #e0a860;
  --chart-5: #7ac4d4;

  --habit-complete: var(--success);
  --habit-partial: #e0a860;
  --habit-missed: #d07060;

  --focus-work: var(--accent);
  --focus-break: var(--success);
  --focus-long-break: #68c4a0;

  --goal-progress: var(--chart-2);
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: var(--success);

  --journal-mood-1: #d07060;
  --journal-mood-2: #e09060;
  --journal-mood-3: #e0c060;
  --journal-mood-4: #7a9eaa;
  --journal-mood-5: #68c4a0;
  --journal-mood-6: #4db8a4;
  --journal-mood-7: #a080c0;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(104, 196, 160, 0.25);
  --heatmap-2: rgba(104, 196, 160, 0.5);
  --heatmap-3: rgba(104, 196, 160, 0.75);
  --heatmap-4: var(--success);
}
```

Paper theme (with font overrides):
```css
/* Paper - Clean editorial */
[data-theme="paper"] {
  --bg-primary: #f4f1ec;
  --bg-secondary: #eae6df;
  --bg-tertiary: #ddd8cf;
  --bg-elevated: #ffffff;

  --border: #ccc6ba;
  --border-subtle: #ddd8cf;

  --text-primary: #1a1a18;
  --text-secondary: #5c5850;
  --text-tertiary: #8a857c;

  --accent: #2d2d2d;
  --accent-muted: #444444;
  --accent-glow: rgba(45, 45, 45, 0.08);

  --success: #5a8a6a;
  --complete: #6a7080;

  --chart-1: #2d2d2d;
  --chart-2: #5a8a6a;
  --chart-3: #8a6a5a;
  --chart-4: #a08a5a;
  --chart-5: #5a7a8a;

  --habit-complete: var(--success);
  --habit-partial: #a08a5a;
  --habit-missed: #8a5a5a;

  --focus-work: var(--accent);
  --focus-break: var(--success);
  --focus-long-break: #5a8a6a;

  --goal-progress: var(--chart-2);
  --goal-active: var(--accent);
  --goal-paused: var(--text-tertiary);

  --routine-active: var(--accent);
  --routine-complete: var(--success);

  --journal-mood-1: #b04040;
  --journal-mood-2: #c07040;
  --journal-mood-3: #b0a040;
  --journal-mood-4: #808080;
  --journal-mood-5: #60a040;
  --journal-mood-6: #409040;
  --journal-mood-7: #a060a0;

  --heatmap-0: var(--bg-tertiary);
  --heatmap-1: rgba(90, 138, 106, 0.2);
  --heatmap-2: rgba(90, 138, 106, 0.4);
  --heatmap-3: rgba(90, 138, 106, 0.6);
  --heatmap-4: var(--success);

  --font-display: var(--font-playfair), Georgia, serif;
  --font-body: var(--font-source-serif), Georgia, serif;
}
```

**Step 3: Update the film grain opacity for light themes**

The existing rule at line 199 `[data-theme="light"] body::before` needs to become:

```css
[data-theme="sand"] body::before,
[data-theme="paper"] body::before {
  opacity: 0.015;
}
```

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS definitions for 6 new themes"
```

---

### Task 4: Update useTheme Hook

**Files:**
- Modify: `hooks/useTheme.ts`

**Step 1: Rewrite the hook to support multi-theme**

Replace the full contents of `hooks/useTheme.ts`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeId, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, getTheme, migrateLegacyTheme } from '@/lib/themes'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_DARK_THEME)
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    const initTheme = async () => {
      // Check localStorage first for immediate display
      const stored = localStorage.getItem('theme')
      if (stored) {
        const migrated = migrateLegacyTheme(stored)
        // Persist migration if value changed
        if (migrated !== stored) {
          localStorage.setItem('theme', migrated)
        }
        setThemeState(migrated)
        document.documentElement.setAttribute('data-theme', migrated)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const defaultTheme = prefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME
        setThemeState(defaultTheme)
        document.documentElement.setAttribute('data-theme', defaultTheme)
      }

      // If logged in, fetch from Supabase and sync
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .single()

        if (data?.theme) {
          const serverTheme = migrateLegacyTheme(data.theme)
          setThemeState(serverTheme)
          localStorage.setItem('theme', serverTheme)
          document.documentElement.setAttribute('data-theme', serverTheme)
        }
      }
    }

    initTheme()
  }, [user, supabase])

  const setTheme = useCallback(async (newTheme: ThemeId) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)

    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, theme: newTheme })
    }
  }, [user, supabase])

  const themeDefinition = getTheme(theme)

  return {
    theme,
    setTheme,
    isDark: themeDefinition?.type === 'dark',
    isLight: themeDefinition?.type === 'light',
    mounted,
  }
}
```

**Step 2: Commit**

```bash
git add hooks/useTheme.ts
git commit -m "feat: update useTheme hook for multi-theme support with migration"
```

---

### Task 5: Update page.tsx Consumer

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update the useTheme destructuring**

At line 51, change:
```typescript
const { isDark, toggleTheme, mounted: themeMounted } = useTheme()
```
to:
```typescript
const { isDark, setTheme, theme, mounted: themeMounted } = useTheme()
```

**Step 2: Update the SettingsPanel props**

At around line 287-288, change:
```tsx
isDark={isDark}
onToggleTheme={toggleTheme}
```
to:
```tsx
isDark={isDark}
currentTheme={theme}
onSetTheme={setTheme}
```

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "refactor: pass theme and setTheme to SettingsPanel"
```

---

### Task 6: Update SettingsPanel with Theme Picker

**Files:**
- Modify: `components/SettingsPanel.tsx`

**Step 1: Update the SettingsPanelProps interface**

Replace the legacy theme props:
```typescript
// Remove these:
isDark: boolean
onToggleTheme: () => void

// Add these:
isDark: boolean
currentTheme: ThemeId
onSetTheme: (theme: ThemeId) => void
```

Add the import at the top:
```typescript
import { THEMES, ThemeId } from '@/lib/themes'
```

Update the destructured props in the function signature accordingly:
```typescript
export function SettingsPanel({
  isOpen,
  onClose,
  isDark,
  currentTheme,
  onSetTheme,
  compact,
  onToggleCompact,
  columnColors,
  onColumnColorChange,
  onResetColors,
}: SettingsPanelProps) {
```

**Step 2: Replace the theme toggle UI (lines 214-243)**

Replace the existing Light/Dark button pair with the dot grid picker:

```tsx
{/* Theme */}
<div>
  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Theme</p>
  <div className="grid grid-cols-4 gap-3">
    {THEMES.map((t) => (
      <button
        key={t.id}
        onClick={() => onSetTheme(t.id)}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
            currentTheme === t.id
              ? 'border-[var(--accent)] scale-110'
              : 'border-transparent hover:border-[var(--text-tertiary)]'
          )}
        >
          {/* Split circle: left = bg, right = accent */}
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full" style={{ backgroundColor: t.colors.bg }} />
            <div className="w-1/2 h-full" style={{ backgroundColor: t.colors.accent }} />
          </div>
        </div>
        <span
          className={cn(
            'text-[9px] uppercase tracking-[0.05em] transition-colors',
            currentTheme === t.id
              ? 'text-[var(--accent)]'
              : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
          )}
        >
          {t.name}
        </span>
      </button>
    ))}
  </div>
</div>
```

**Step 3: Remove `Moon` and `Sun` from the lucide imports if they're no longer used elsewhere in this file**

Check the General section header — it uses `Sun` as the icon. Keep `Sun` in imports, remove `Moon` only if unused.

**Step 4: Commit**

```bash
git add components/SettingsPanel.tsx
git commit -m "feat: replace dark/light toggle with theme picker grid"
```

---

### Task 7: Clean Up ThemeToggle Component

**Files:**
- Modify: `components/ThemeToggle.tsx`

**Step 1: Check if ThemeToggle is used anywhere besides the settings panel**

Search for `ThemeToggle` imports. If it's only used in one place or not used at all, decide whether to update or remove it. Based on the codebase search, it exists as a standalone component. If it's not imported anywhere (the settings panel has its own inline toggle), it can be deleted. If it IS used somewhere (like a header), update it to show a simpler theme indicator or keep it as a quick toggle between the two most recent themes.

Check usage with: `grep -r "ThemeToggle" --include="*.tsx" --include="*.ts"`

If unused: delete the file.
If used: update props to accept `currentTheme` and `onSetTheme` and render a simplified version.

**Step 2: Commit**

```bash
git commit -m "chore: clean up ThemeToggle component"
```

---

### Task 8: Visual Verification

**Step 1: Open http://localhost:3000 in the browser**

**Step 2: Open Settings panel, verify the theme picker grid appears**

- All 8 dots visible in a 4x2 grid
- Each dot shows correct bg/accent split colors
- Active theme has accent ring
- Theme names visible below dots

**Step 3: Click each theme and verify:**

- Colors change smoothly (transition)
- Fonts change for Nord (Inter), Mono (JetBrains Mono), Paper (Playfair + Source Serif)
- Film grain overlay adjusts for light themes
- No flash of wrong theme on page reload
- Theme persists after refresh (localStorage)

**Step 4: Verify migration**

In browser console: `localStorage.setItem('theme', 'dark')` then reload — should resolve to Ember.
`localStorage.setItem('theme', 'light')` then reload — should resolve to Sand.

**Step 5: Commit any fixes needed, then final commit**

```bash
git add -A
git commit -m "feat: theme picker with 8 themes and per-theme fonts"
```
