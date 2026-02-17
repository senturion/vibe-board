# Habits Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add build/avoid habit types with per-habit tracking modes, Lucide icon picker, and redesigned calendar month view with icons.

**Architecture:** Extend existing Habit data model with `habitType` and `trackingMode` fields. Add icon picker to HabitEditor. Update HabitsContext streak/completion logic for avoid habits. Redesign calendar month view cells to show habit icons with completion state. DB columns added via Supabase SQL migration.

**Tech Stack:** Next.js, TypeScript, Supabase (habits table), Lucide React icons, CSS custom properties.

---

### Task 1: Add Database Columns

**Files:**
- Modify: `supabase-schema.sql:243-259` (documentation only)

**Step 1: Run SQL migration on Supabase**

Execute this SQL in the Supabase SQL editor:

```sql
ALTER TABLE public.habits
ADD COLUMN habit_type text NOT NULL DEFAULT 'build',
ADD COLUMN tracking_mode text NOT NULL DEFAULT 'manual';
```

**Step 2: Update the schema documentation file**

In `supabase-schema.sql`, add the two new columns to the habits table definition after the `icon` line (line 255):

```sql
  habit_type text not null default 'build', -- 'build' or 'avoid'
  tracking_mode text not null default 'manual', -- 'manual' or 'auto-complete'
```

**Step 3: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add habit_type and tracking_mode columns to habits table"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types/habits.ts`

**Step 1: Add new types and update Habit interface**

Add after line 2 (`export type FrequencyType = ...`):

```typescript
export type HabitType = 'build' | 'avoid'
export type TrackingMode = 'manual' | 'auto-complete'
```

Add to the `Habit` interface after `icon?: string` (line 25):

```typescript
  habitType: HabitType
  trackingMode: TrackingMode
```

**Step 2: Commit**

```bash
git add lib/types/habits.ts
git commit -m "feat: add HabitType and TrackingMode to Habit interface"
```

---

### Task 3: Create Icon Constants

**Files:**
- Create: `lib/constants/habit-icons.ts`

**Step 1: Create the curated icon list**

```typescript
export interface HabitIconGroup {
  label: string
  icons: string[]
}

export const HABIT_ICON_GROUPS: HabitIconGroup[] = [
  {
    label: 'Fitness',
    icons: ['dumbbell', 'bike', 'footprints', 'heart', 'activity'],
  },
  {
    label: 'Wellness',
    icons: ['moon', 'sun', 'droplets', 'apple', 'leaf'],
  },
  {
    label: 'Mind',
    icons: ['book', 'book-open', 'brain', 'pencil', 'graduation-cap'],
  },
  {
    label: 'Social',
    icons: ['users', 'message-circle', 'phone', 'hand-heart'],
  },
  {
    label: 'Productivity',
    icons: ['clock', 'target', 'zap', 'check-square', 'list-todo'],
  },
  {
    label: 'Avoid',
    icons: ['ban', 'shield-x', 'circle-off', 'x-circle', 'coffee', 'wine', 'cigarette', 'smartphone'],
  },
]

export const ALL_HABIT_ICONS = HABIT_ICON_GROUPS.flatMap(g => g.icons)

export const DEFAULT_ICON = 'target'

/** Infer an icon from habit name keywords */
export function inferIconFromName(name: string): string {
  const lower = name.toLowerCase()
  const mappings: [string[], string][] = [
    [['read', 'book', 'study'], 'book'],
    [['water', 'drink', 'hydrat'], 'droplets'],
    [['run', 'jog', 'walk', 'step'], 'footprints'],
    [['gym', 'workout', 'exercise', 'lift', 'weight'], 'dumbbell'],
    [['meditat', 'mindful', 'breath'], 'brain'],
    [['sleep', 'bed', 'rest'], 'moon'],
    [['write', 'journal', 'diary'], 'pencil'],
    [['bike', 'cycle', 'cycling'], 'bike'],
    [['call', 'phone'], 'phone'],
    [['coffee'], 'coffee'],
    [['smoke', 'cigarette'], 'cigarette'],
    [['alcohol', 'drink', 'wine', 'beer'], 'wine'],
    [['screen', 'phone', 'social media'], 'smartphone'],
    [['eat', 'food', 'diet', 'fruit', 'vegetable'], 'apple'],
  ]

  for (const [keywords, icon] of mappings) {
    if (keywords.some(k => lower.includes(k))) return icon
  }

  return DEFAULT_ICON
}
```

**Step 2: Commit**

```bash
git add lib/constants/habit-icons.ts
git commit -m "feat: add curated habit icon list with name inference"
```

---

### Task 4: Create Icon Picker Component

**Files:**
- Create: `components/habits/IconPicker.tsx`

**Step 1: Build the icon picker component**

This renders a compact grid of Lucide icons, similar to the existing color picker in HabitEditor. Uses dynamic Lucide icon rendering.

```typescript
'use client'

import { useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { HABIT_ICON_GROUPS } from '@/lib/constants/habit-icons'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  selected: string | undefined
  onSelect: (icon: string) => void
  color: string
}

/** Convert kebab-case icon name to PascalCase component name */
function getIconComponent(name: string): LucideIcons.LucideIcon | null {
  const pascalCase = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const icon = (LucideIcons as Record<string, unknown>)[pascalCase]
  return (typeof icon === 'function' ? icon : null) as LucideIcons.LucideIcon | null
}

export function IconPicker({ selected, onSelect, color }: IconPickerProps) {
  const allIcons = useMemo(() => HABIT_ICON_GROUPS.flatMap(g => g.icons), [])

  return (
    <div className="flex flex-wrap gap-1.5">
      {allIcons.map((iconName) => {
        const Icon = getIconComponent(iconName)
        if (!Icon) return null

        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={cn(
              'w-8 h-8 flex items-center justify-center transition-all rounded',
              selected === iconName
                ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-elevated)] scale-110'
                : 'hover:bg-[var(--bg-tertiary)]'
            )}
            style={{
              color: selected === iconName ? color : 'var(--text-secondary)',
              '--tw-ring-color': color,
            } as React.CSSProperties}
            title={iconName}
          >
            <Icon size={18} />
          </button>
        )
      })}
    </div>
  )
}

/** Render a habit icon by name. Reusable across calendar, cards, etc. */
export function HabitIcon({
  name,
  size = 14,
  color,
  className,
}: {
  name: string
  size?: number
  color?: string
  className?: string
}) {
  const Icon = getIconComponent(name)
  if (!Icon) return null
  return <Icon size={size} color={color} className={className} />
}
```

**Step 2: Commit**

```bash
git add components/habits/IconPicker.tsx
git commit -m "feat: add IconPicker and HabitIcon components"
```

---

### Task 5: Update HabitEditor with Type, Mode, and Icon Picker

**Files:**
- Modify: `components/habits/HabitEditor.tsx`

**Step 1: Add imports**

Add to imports:

```typescript
import { IconPicker } from './IconPicker'
import { HabitType, TrackingMode } from '@/lib/types'
import { inferIconFromName } from '@/lib/constants/habit-icons'
```

**Step 2: Add state variables**

After line 38 (`const [color, setColor] = useState(HABIT_COLORS[0])`), add:

```typescript
const [habitType, setHabitType] = useState<HabitType>('build')
const [trackingMode, setTrackingMode] = useState<TrackingMode>('manual')
const [icon, setIcon] = useState<string | undefined>()
```

**Step 3: Update the useEffect to load/reset these fields**

In the `if (habit)` block (around line 46-53), add:

```typescript
setHabitType(habit.habitType || 'build')
setTrackingMode(habit.trackingMode || 'manual')
setIcon(habit.icon)
```

In the `else` reset block (around line 54-63), add:

```typescript
setHabitType('build')
setTrackingMode('manual')
setIcon(undefined)
```

**Step 4: Update handleSubmit to include new fields**

In `handleSubmit` (around line 74-85), update the `onSave` call to include:

```typescript
habitType,
trackingMode: habitType === 'avoid' ? trackingMode : 'manual',
targetCount: habitType === 'avoid' ? 1 : targetCount,
icon: icon || inferIconFromName(name.trim()),
```

Replace the existing `targetCount`, and `icon: undefined` lines.

**Step 5: Add Habit Type selector UI**

Insert before the Name field (before the `{/* Name */}` comment around line 130):

```tsx
{/* Habit Type */}
<div>
  <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
    Type
  </label>
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => setHabitType('build')}
      className={cn(
        'flex-1 px-3 py-2 text-[12px] border transition-colors',
        habitType === 'build'
          ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
      )}
    >
      Build
    </button>
    <button
      type="button"
      onClick={() => setHabitType('avoid')}
      className={cn(
        'flex-1 px-3 py-2 text-[12px] border transition-colors',
        habitType === 'avoid'
          ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
      )}
    >
      Avoid
    </button>
  </div>
  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
    {habitType === 'build' ? 'Do something regularly' : 'Stop doing something'}
  </p>
</div>
```

**Step 6: Add Tracking Mode selector (conditionally shown)**

Insert after the Habit Type block:

```tsx
{/* Tracking Mode (avoid only) */}
{habitType === 'avoid' && (
  <div>
    <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
      Tracking
    </label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setTrackingMode('auto-complete')}
        className={cn(
          'flex-1 px-3 py-2 text-[12px] border transition-colors',
          trackingMode === 'auto-complete'
            ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
        )}
      >
        Mark failures
      </button>
      <button
        type="button"
        onClick={() => setTrackingMode('manual')}
        className={cn(
          'flex-1 px-3 py-2 text-[12px] border transition-colors',
          trackingMode === 'manual'
            ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
        )}
      >
        Confirm daily
      </button>
    </div>
    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
      {trackingMode === 'auto-complete'
        ? 'Assumed successful — only log slips'
        : 'Manually confirm avoidance each day'}
    </p>
  </div>
)}
```

**Step 7: Hide target count for avoid habits**

Wrap the existing target count section in:

```tsx
{habitType === 'build' && (
  ... existing target count UI ...
)}
```

**Step 8: Add Icon Picker after Color picker**

Insert after the `{/* Color */}` section (after line 308):

```tsx
{/* Icon */}
<div>
  <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
    Icon
  </label>
  <IconPicker
    selected={icon}
    onSelect={setIcon}
    color={color}
  />
</div>
```

**Step 9: Commit**

```bash
git add components/habits/HabitEditor.tsx
git commit -m "feat: add habit type, tracking mode, and icon picker to editor"
```

---

### Task 6: Update HabitsContext for New Fields

**Files:**
- Modify: `contexts/HabitsContext.tsx`

**Step 1: Update the habit mapping in data fetch**

In the `mappedHabits` mapping (around line 126-141), add after `icon`:

```typescript
habitType: (h.habit_type as HabitType) || 'build',
trackingMode: (h.tracking_mode as TrackingMode) || 'manual',
```

Add the imports at the top:

```typescript
import { HabitType, TrackingMode } from '@/lib/types'
```

(These types should already be exported from `@/lib/types` if the barrel file re-exports from `habits.ts`.)

**Step 2: Update `addHabit` insert**

In the `addHabit` function's Supabase insert (around line 192-206), add:

```typescript
habit_type: habit.habitType || 'build',
tracking_mode: habit.trackingMode || 'manual',
```

In the `newHabit` mapping after insert (around line 215-229), add:

```typescript
habitType: (data.habit_type as HabitType) || 'build',
trackingMode: (data.tracking_mode as TrackingMode) || 'manual',
```

**Step 3: Update `updateHabit`**

In the `updateHabit` function's `dbUpdates` mapping (around line 260-270), add:

```typescript
if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType
if (updates.trackingMode !== undefined) dbUpdates.tracking_mode = updates.trackingMode
```

**Step 4: Update streak computation for avoid habits**

In `computeStreakFromCompletions` (around line 373), the logic needs to account for avoid habits with auto-complete tracking mode. For auto-complete avoid habits, a streak is consecutive days with NO completion records (since a completion = a slip).

Find the `computeStreakFromCompletions` function and add a branch at the beginning:

```typescript
const isAvoidAutoComplete = habit.habitType === 'avoid' && habit.trackingMode === 'auto-complete'
```

For `isAvoidAutoComplete` habits, the streak calculation is inverted:
- Sort all dates from habit creation to today
- Count consecutive days (going backward from today/yesterday) where there is NO completion record
- A completion record on any day breaks the streak

This is a significant logic change. The existing streak code iterates `completedDays` going backward. For avoid auto-complete, instead iterate ALL days going backward and check for ABSENCE of completions.

**Step 5: Update `toggleHabit` for avoid auto-complete**

For avoid auto-complete habits, the toggle semantics are inverted in the UI but the DB operation is the same (add/remove completion). The existing code already handles this correctly — a toggle adds or removes a completion. The UI interpretation (slip vs success) is handled in the card component.

No changes needed to `toggleHabit` logic.

**Step 6: Commit**

```bash
git add contexts/HabitsContext.tsx
git commit -m "feat: support habitType and trackingMode in context"
```

---

### Task 7: Update HabitCard for Avoid Habits

**Files:**
- Modify: `components/habits/HabitCard.tsx`

**Step 1: Add imports**

```typescript
import { HabitIcon } from './IconPicker'
import { Ban } from 'lucide-react'
```

**Step 2: Add avoid habit state logic**

After the existing `const isAtRisk` block, add:

```typescript
const isAvoid = habit.habitType === 'avoid'
const isAutoComplete = habit.trackingMode === 'auto-complete'
```

**Step 3: Update checkbox/button rendering**

For the full card (non-compact) variant:
- Build habits: keep existing checkbox behavior
- Avoid auto-complete: the checkbox shows inverted state — "checked" = clean (no completion), "unchecked" = slipped (has completion). Actually, the toggle already works because clicking when complete removes completion, clicking when incomplete adds one. For avoid auto-complete, the meaning is just reversed in the label.

Update the label text near the habit name to show:
- Build: show count/target as existing
- Avoid auto-complete: show "Clean" (when no completion) or "Slipped" (when has completion) with appropriate colors
- Avoid manual: show "Confirmed" or "Not tracked"

**Step 4: Add subtle avoid badge**

For avoid habits, show a small `Ban` icon (8px) overlaid on the color indicator bar or next to the name:

```tsx
{isAvoid && (
  <Ban size={10} className="text-[var(--text-tertiary)]" />
)}
```

**Step 5: Show habit icon in the card**

Add the habit icon next to the name if one is set:

```tsx
{habit.icon && (
  <HabitIcon name={habit.icon} size={14} color={habit.color} className="shrink-0" />
)}
```

**Step 6: Commit**

```bash
git add components/habits/HabitCard.tsx
git commit -m "feat: update HabitCard for avoid habits with icons"
```

---

### Task 8: Redesign Calendar Month View Cells

**Files:**
- Modify: `components/habits/HabitsPage.tsx` (the `renderDayContent` callback, around lines 590-622)

**Step 1: Update the `renderDayContent` callback**

Replace the existing `renderDayContent` function in the month view section. The new version:
- Shows up to 4 habit icons (14px) instead of colored bars
- Uses `HabitIcon` component for rendering
- Completed habits show solid, incomplete show faded (opacity 0.3)
- Avoid habits get a tiny overlay indicator
- Day gets a left border color based on overall completion

```tsx
renderDayContent={(date, dayCompletions) => {
  // Get all active habits for this date
  const dateKey = date.toISOString().split('T')[0]
  const activeHabits = habits.filter(h => {
    if (!h.isActive) return false
    // Check if habit was active on this date based on frequency
    if (h.frequencyType === 'daily') return true
    if (h.frequencyType === 'specific_days') {
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
      return h.specificDays?.includes(dayOfWeek as DayOfWeek) ?? false
    }
    return true // weekly habits active any day
  })

  if (activeHabits.length === 0) return null

  // Build completion map for this day
  const completedHabitIds = new Set<string>()
  dayCompletions.forEach(c => {
    const habit = habits.find(h => h.id === c.habitId)
    if (!habit) return
    if (habit.habitType === 'avoid' && habit.trackingMode === 'auto-complete') {
      // For avoid auto-complete, having a completion = slipped (NOT completed)
      return
    }
    const total = dayCompletions
      .filter(dc => dc.habitId === c.habitId)
      .reduce((sum, dc) => sum + dc.count, 0)
    if (total >= habit.targetCount) {
      completedHabitIds.add(c.habitId)
    }
  })

  // For avoid auto-complete, no completion = success
  activeHabits.forEach(h => {
    if (h.habitType === 'avoid' && h.trackingMode === 'auto-complete') {
      const hasSlip = dayCompletions.some(c => c.habitId === h.id)
      if (!hasSlip) completedHabitIds.add(h.id)
    }
  })

  const displayHabits = activeHabits.slice(0, 4)
  const overflow = activeHabits.length - 4
  const allComplete = activeHabits.every(h => completedHabitIds.has(h.id))
  const noneComplete = activeHabits.every(h => !completedHabitIds.has(h.id))

  return (
    <div className={cn(
      'space-y-0.5',
      allComplete && 'border-l-2 border-[var(--success)] -ml-1 pl-0.5',
      noneComplete && dayCompletions.length === 0 && date < new Date() && 'border-l-2 border-red-400/30 -ml-1 pl-0.5'
    )}>
      <div className="flex flex-wrap gap-0.5">
        {displayHabits.map(h => (
          <HabitIcon
            key={h.id}
            name={h.icon || 'target'}
            size={12}
            color={h.color}
            className={cn(
              'transition-opacity',
              completedHabitIds.has(h.id) ? 'opacity-100' : 'opacity-30'
            )}
          />
        ))}
      </div>
      {overflow > 0 && (
        <div className="text-[8px] text-[var(--text-tertiary)]">
          +{overflow}
        </div>
      )}
    </div>
  )
}}
```

**Step 2: Add import for HabitIcon at top of file**

```typescript
import { HabitIcon } from './IconPicker'
```

Also import `DayOfWeek` if not already imported.

**Step 3: Update Day view rendering**

In the day view `renderItem` callback (around line 531-551), add the habit icon:

Replace the checkmark div with:
```tsx
<HabitIcon
  name={habit.icon || 'target'}
  size={16}
  color={habit.color}
/>
```

**Step 4: Update Week view rendering**

In the week view `renderItem` callback (around line 564-575), add the icon before the name:

```tsx
<div
  className="px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1"
  style={{ backgroundColor: habit.color + '20', color: habit.color }}
>
  <HabitIcon name={habit.icon || 'target'} size={10} color={habit.color} />
  {habit.name}
</div>
```

**Step 5: Commit**

```bash
git add components/habits/HabitsPage.tsx
git commit -m "feat: redesign calendar views with habit icons and completion state"
```

---

### Task 9: Visual Verification

**Step 1: Create a new "Build" habit with an icon**

- Open Habits page, click "+ New Habit"
- Verify Type selector shows "Build" / "Avoid" buttons
- Select "Build", verify tracking mode is NOT shown
- Pick a name, color, and icon from the picker
- Save, verify icon appears on the habit card

**Step 2: Create a new "Avoid" habit with auto-complete**

- Click "+ New Habit", select "Avoid"
- Verify tracking mode selector appears with "Mark failures" / "Confirm daily"
- Select "Mark failures" (auto-complete)
- Verify target count is hidden
- Save, verify card shows "Clean" state and avoid badge

**Step 3: Test avoid habit interaction**

- Click the avoid habit — should mark a "slip"
- Card should show "Slipped" state
- Click again — should remove the slip

**Step 4: Check calendar month view**

- Navigate to Calendar view
- Verify icons appear in day cells instead of colored bars
- Check completed habits show solid, incomplete show faded
- Verify "all complete" days have green left border

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "feat: habits refresh with build/avoid types, icons, and calendar redesign"
```
