# Stale Tasks Resurfacing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface tasks that haven't been updated in a configurable number of days, via sidebar widget, board card indicators, and a toast notification.

**Architecture:** Client-side staleness detection using `KanbanTask.updatedAt`. New `useStaleTasks` hook computes stale tasks, consumed by a sidebar widget, card indicators, and a page-load toast. Per-board threshold stored in Supabase `boards` table. Snooze state in localStorage.

**Tech Stack:** Next.js, TypeScript, Supabase (boards table migration), Lucide React icons, CSS custom properties.

---

### Task 1: Add Database Column and Update Board Type

**Files:**
- Modify: `supabase-schema.sql` (add `stale_days_threshold` to boards table documentation)
- Modify: `lib/types/kanban.ts:33-37` (add `staleDaysThreshold` to Board interface)
- Modify: `hooks/useBoards.ts:49-53` (map new column in fetch)
- Modify: `hooks/useBoards.ts:147-161` (handle new field in updateBoard)

**Step 1: Run SQL migration on Supabase**

Execute in the Supabase SQL editor:

```sql
ALTER TABLE public.boards
ADD COLUMN stale_days_threshold integer DEFAULT NULL;
```

**Step 2: Update schema documentation**

In `supabase-schema.sql`, add after the `created_at` line in the boards table definition:

```sql
  stale_days_threshold integer default null -- days before tasks are flagged stale; null = 7
```

**Step 3: Update Board interface**

In `lib/types/kanban.ts`, add `staleDaysThreshold` to the `Board` interface:

```typescript
export interface Board {
  id: string
  name: string
  createdAt: number
  staleDaysThreshold?: number
}
```

**Step 4: Map new field in useBoards fetch**

In `hooks/useBoards.ts`, update the `mappedBoards` mapping (around line 49) to include:

```typescript
const mappedBoards: Board[] = (data as BoardRow[]).map(b => ({
  id: b.id,
  name: b.name,
  createdAt: new Date(b.created_at).getTime(),
  staleDaysThreshold: (b as any).stale_days_threshold ?? undefined,
}))
```

**Step 5: Update updateBoard to persist staleDaysThreshold**

In `hooks/useBoards.ts`, update the `updateBoard` callback (around line 147) to also send `stale_days_threshold`:

```typescript
const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.staleDaysThreshold !== undefined) dbUpdates.stale_days_threshold = updates.staleDaysThreshold

  const { error } = await supabase
    .from('boards')
    .update(dbUpdates)
    .eq('id', id)

  if (error) {
    console.error('Error updating board:', error)
    return
  }

  setBoards(prev => prev.map(board =>
    board.id === id ? { ...board, ...updates } : board
  ))
}, [supabase])
```

**Step 6: Commit**

```bash
git add supabase-schema.sql lib/types/kanban.ts hooks/useBoards.ts
git commit -m "feat: add stale_days_threshold to boards table and Board type"
```

---

### Task 2: Create useStaleTasks Hook

**Files:**
- Create: `hooks/useStaleTasks.ts`

**Step 1: Create the hook**

Create `hooks/useStaleTasks.ts`:

```typescript
'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { KanbanTask, Board } from '@/lib/types'

const SNOOZE_KEY = 'vibe-stale-snooze'
const DEFAULT_STALE_DAYS = 7
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

function loadSnoozeState(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    // Clean expired snoozes
    const now = Date.now()
    const cleaned: Record<string, number> = {}
    for (const [id, until] of Object.entries(parsed)) {
      if (until > now) cleaned[id] = until
    }
    return cleaned
  } catch {
    return {}
  }
}

function saveSnoozeState(state: Record<string, number>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(state))
}

interface UseStaleTasks {
  staleTasks: KanbanTask[]
  staleTaskIds: Set<string>
  snoozeTask: (id: string) => void
}

export function useStaleTasks(tasks: KanbanTask[], boards: Board[]): UseStaleTasks {
  const [snoozeState, setSnoozeState] = useState<Record<string, number>>({})

  useEffect(() => {
    setSnoozeState(loadSnoozeState())
  }, [])

  const boardThresholdMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const board of boards) {
      // 0 means "never" — disable stale detection
      if (board.staleDaysThreshold === 0) {
        map.set(board.id, Infinity)
      } else {
        map.set(board.id, (board.staleDaysThreshold ?? DEFAULT_STALE_DAYS) * MS_PER_DAY)
      }
    }
    return map
  }, [boards])

  const staleTasks = useMemo(() => {
    const now = Date.now()
    return tasks
      .filter(task => {
        if (task.column === 'backlog' || task.column === 'complete') return false
        if (task.completedAt || task.archivedAt) return false
        if (snoozeState[task.id] && snoozeState[task.id] > now) return false

        const thresholdMs = task.boardId
          ? (boardThresholdMap.get(task.boardId) ?? DEFAULT_STALE_DAYS * MS_PER_DAY)
          : DEFAULT_STALE_DAYS * MS_PER_DAY

        if (thresholdMs === Infinity) return false

        const lastTouched = task.updatedAt ?? task.createdAt
        return (now - lastTouched) > thresholdMs
      })
      .sort((a, b) => (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt))
  }, [tasks, snoozeState, boardThresholdMap])

  const staleTaskIds = useMemo(() => new Set(staleTasks.map(t => t.id)), [staleTasks])

  const snoozeTask = useCallback((id: string) => {
    setSnoozeState(prev => {
      const next = { ...prev, [id]: Date.now() + SNOOZE_DURATION_MS }
      saveSnoozeState(next)
      return next
    })
  }, [])

  return { staleTasks, staleTaskIds, snoozeTask }
}
```

**Step 2: Commit**

```bash
git add hooks/useStaleTasks.ts
git commit -m "feat: add useStaleTasks hook for stale task detection"
```

---

### Task 3: Create StaleMiniWidget Sidebar Widget

**Files:**
- Create: `components/sidebar/widgets/StaleMiniWidget.tsx`
- Modify: `components/sidebar/widgets/index.ts` (add export)
- Modify: `components/sidebar/Sidebar.tsx:22` (add to SidebarWidgetId type)
- Modify: `components/sidebar/Sidebar.tsx:32-45` (add to SIDEBAR_WIDGETS array and import)

**Step 1: Create StaleMiniWidget component**

Create `components/sidebar/widgets/StaleMiniWidget.tsx`:

```typescript
'use client'

import { AlarmClockOff, BellOff, Archive } from 'lucide-react'
import { useKanban } from '@/hooks/useKanban'
import { useBoards } from '@/hooks/useBoards'
import { useStaleTasks } from '@/hooks/useStaleTasks'
import { useKanbanActions } from '@/contexts/KanbanActionsContext'

function formatRelativeTime(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function StaleMiniWidget() {
  const { tasks } = useKanban()
  const { boards } = useBoards()
  const { staleTasks, snoozeTask } = useStaleTasks(tasks, boards)
  const actions = (() => {
    try {
      return useKanbanActions()
    } catch {
      return null
    }
  })()

  if (staleTasks.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-[10px] text-[var(--text-tertiary)]">All caught up</p>
      </div>
    )
  }

  const displayed = staleTasks.slice(0, 5)
  const boardNameMap = new Map(boards.map(b => [b.id, b.name]))

  return (
    <div className="space-y-1.5">
      {staleTasks.length > 5 && (
        <p className="text-[9px] text-[var(--text-tertiary)] px-1">
          {staleTasks.length} stale tasks total
        </p>
      )}
      {displayed.map(task => (
        <div
          key={task.id}
          className="group flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
        >
          <AlarmClockOff size={10} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--text-secondary)] truncate">
              {task.title}
            </p>
            <p className="text-[8px] text-[var(--text-tertiary)]">
              {task.boardId ? boardNameMap.get(task.boardId) ?? '' : ''}
              {' · '}
              {formatRelativeTime(task.updatedAt ?? task.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => snoozeTask(task.id)}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Snooze 7 days"
            >
              <BellOff size={10} />
            </button>
            {actions && (
              <button
                onClick={() => actions.onArchiveTask?.(task.id)}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                title="Archive"
              >
                <Archive size={10} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

Note: The `useKanbanActions()` is wrapped in a try/catch because the sidebar widget may render outside the `KanbanActionsProvider` context. If so, only snooze is available (archive won't show). This is a safe fallback.

**Step 2: Export from widgets index**

In `components/sidebar/widgets/index.ts`, add:

```typescript
export { StaleMiniWidget } from './StaleMiniWidget'
```

**Step 3: Register widget in Sidebar.tsx**

In `components/sidebar/Sidebar.tsx`:

1. Add to the import (line 7-18):

```typescript
import {
  QuoteWidget,
  WeatherWidget,
  HabitsMiniWidget,
  FocusMiniWidget,
  GoalsMiniWidget,
  WorkLocationWidget,
  DeadlinesMiniWidget,
  StreaksMiniWidget,
  ActivityMiniWidget,
  InsightsMiniWidget,
  StaleMiniWidget,
} from './widgets'
```

2. Add `'stale'` to the `SidebarWidgetId` type (line 22):

```typescript
type SidebarWidgetId = 'weather' | 'quote' | 'workLocation' | 'focus' | 'habits' | 'goals' | 'tasks' | 'notes' | 'deadlines' | 'streaks' | 'activity' | 'insights' | 'stale'
```

3. Add to the `SIDEBAR_WIDGETS` array (after the `insights` entry, before the closing `]`):

```typescript
{ id: 'stale', title: 'Stale Tasks', component: StaleMiniWidget, defaultVisible: true, defaultOrder: 6.5 },
```

Place it after deadlines (order 6) so it appears near deadline-related info. Use `6.5` or adjust to a whole number — the order just determines default position for new installs.

**Step 4: Commit**

```bash
git add components/sidebar/widgets/StaleMiniWidget.tsx components/sidebar/widgets/index.ts components/sidebar/Sidebar.tsx
git commit -m "feat: add stale tasks sidebar widget"
```

---

### Task 4: Add Stale Indicator to Board Cards

**Files:**
- Modify: `components/kanban/Card.tsx:12-18` (add `isStale` prop)
- Modify: `components/kanban/Card.tsx` (render amber indicator)
- Modify: `components/kanban/Column.tsx:16-32` (add `staleTaskIds` prop)
- Modify: `components/kanban/Column.tsx:229-236` (pass `isStale` to Card)
- Modify: `components/kanban/Board.tsx` (compute stale tasks, pass to Column)

**Step 1: Add isStale prop to Card**

In `components/kanban/Card.tsx`, add `isStale` to the `CardProps` interface (line 12-18):

```typescript
interface CardProps {
  task: KanbanTask
  index?: number
  compact?: boolean
  accentColor?: string
  focusedTaskId?: string | null
  isStale?: boolean
}
```

Update the component signature (line 27):

```typescript
export const Card = memo(function Card({ task, compact = false, accentColor, focusedTaskId, isStale }: CardProps) {
```

**Step 2: Add amber dot indicator for stale tasks**

In both the compact and full mode renders, add an amber dot next to the existing overdue/due-soon indicators.

For **compact mode** (around line 104, after the `dueSoon` dot):

```typescript
{isStale && !overdue && !dueSoon && <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" role="status" aria-label="Stale" title={`Last updated ${Math.floor((Date.now() - (task.updatedAt ?? task.createdAt)) / (24 * 60 * 60 * 1000))} days ago`} />}
```

For **full mode**, add an amber left-border accent. Replace the column color indicator div (line 155-159) with a conditional:

```typescript
{/* Column color indicator — amber override if stale */}
<div
  className="absolute left-0 top-0 bottom-0 w-0.5"
  style={{ backgroundColor: isStale ? '#f59e0b' : (accentColor || priorityColor) }}
  aria-hidden="true"
/>
```

**Step 3: Add staleTaskIds prop to Column**

In `components/kanban/Column.tsx`, add to `ColumnProps` (line 16-32):

```typescript
staleTaskIds?: Set<string>
```

Update the component destructuring (line 34):

```typescript
export const Column = memo(function Column({
  id,
  title,
  tasks,
  index,
  accentColor,
  onColorChange,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
  isCustom = false,
  onRename,
  onDelete,
  compact = false,
  focusedTaskId,
  staleTaskIds,
}: ColumnProps) {
```

**Step 4: Pass isStale to Card**

In `components/kanban/Column.tsx`, update the Card render (around line 230-236):

```typescript
<Card
  task={task}
  index={taskIndex}
  compact={compact}
  accentColor={accentColor}
  focusedTaskId={focusedTaskId}
  isStale={staleTaskIds?.has(task.id)}
/>
```

**Step 5: Compute staleTaskIds in Board and pass to Column**

In `components/kanban/Board.tsx`:

Add imports at the top:

```typescript
import { useBoards } from '@/hooks/useBoards'
import { useStaleTasks } from '@/hooks/useStaleTasks'
```

Inside the `Board` component function (after the existing hooks around line 46-48), add:

```typescript
const { boards } = useBoards()
const { staleTaskIds } = useStaleTasks(tasks, boards)
```

Note: `tasks` is already available from the `useUndoRedoKanbanActions` hook.

Then find where `<Column>` is rendered and pass `staleTaskIds`:

```typescript
<Column
  // ... existing props
  staleTaskIds={staleTaskIds}
/>
```

Search for `<Column` in Board.tsx to find the exact render location and add `staleTaskIds={staleTaskIds}` to each Column render.

**Step 6: Commit**

```bash
git add components/kanban/Card.tsx components/kanban/Column.tsx components/kanban/Board.tsx
git commit -m "feat: add stale task indicator to board cards"
```

---

### Task 5: Add Stale Tasks Toast Notification

**Files:**
- Modify: `app/page.tsx` (add toast on page load when stale tasks exist)

**Step 1: Add stale tasks toast logic**

In `app/page.tsx`, the component already has access to `useKanban` and toast infrastructure. We need to add a `useEffect` that fires once on mount when stale tasks are detected.

Add imports:

```typescript
import { useStaleTasks } from '@/hooks/useStaleTasks'
```

Inside the page component, after the existing hooks, add:

```typescript
const { staleTasks: allStaleTasks } = useStaleTasks(tasks, boards)
```

Note: `tasks` comes from the existing kanban hook and `boards` from `useBoards` — both should already be in scope or need to be destructured. Check the existing page.tsx to see what's already available.

Add a `useEffect` for the toast:

```typescript
useEffect(() => {
  if (allStaleTasks.length === 0) return
  if (typeof window === 'undefined') return
  if (sessionStorage.getItem('vibe-stale-toast-shown')) return

  sessionStorage.setItem('vibe-stale-toast-shown', '1')

  // Use the existing toast system — add an info toast
  // The UndoRedoContext manages toasts; we need to either extend it or add a standalone toast
  // For simplicity, we'll create a minimal standalone approach
}, [allStaleTasks.length])
```

**Important:** The existing toast system is tied to the `UndoRedoContext` and only supports `'undo' | 'redo' | 'info'` types. The `'info'` type already exists. However, the `showToast` function is internal to the context.

**Approach:** Extend the `UndoRedoContext` to expose a `showInfoToast(message: string)` method. This keeps all toast management in one place.

In `contexts/UndoRedoContext.tsx`:

1. Add `showInfoToast` to the context type (line 14-18):

```typescript
interface UndoRedoContextType {
  canUndo: boolean
  canRedo: boolean
  pushAction: (action: HistoryAction) => void
  showInfoToast: (message: string) => void
}
```

2. Add the method in the provider (after the existing `showToast`, around line 36):

```typescript
const showInfoToast = useCallback((message: string) => {
  const toast: ToastData = {
    id: generateId(),
    type: 'info',
    message,
  }
  setToasts(prev => [...prev.slice(-2), toast])
}, [])
```

3. Add to the context value (line 109-116):

```typescript
<UndoRedoContext.Provider
  value={{
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    pushAction,
    showInfoToast,
  }}
>
```

4. Export it from the `useUndoRedo` hook (already exported, no change needed since the context type is updated).

Then back in `app/page.tsx`, use:

```typescript
const { showInfoToast } = useUndoRedo()

useEffect(() => {
  if (allStaleTasks.length === 0) return
  if (typeof window === 'undefined') return
  if (sessionStorage.getItem('vibe-stale-toast-shown')) return

  sessionStorage.setItem('vibe-stale-toast-shown', '1')
  const count = allStaleTasks.length
  showInfoToast(`You have ${count} task${count === 1 ? '' : 's'} that haven't been touched in a while`)
}, [allStaleTasks.length, showInfoToast])
```

**Step 2: Commit**

```bash
git add contexts/UndoRedoContext.tsx app/page.tsx
git commit -m "feat: add stale tasks toast notification on page load"
```

---

### Task 6: Add Board Stale Threshold Settings

**Files:**
- Modify: `components/Header.tsx` (add stale threshold selector to board edit UI)

**Step 1: Add stale threshold setting to board dropdown**

In `components/Header.tsx`, when a board is in edit mode (the `editingId === board.id` branch, around line 126-156), add a dropdown below the name input for the stale threshold.

After the name input and save/cancel buttons, add:

```typescript
<div className="flex items-center gap-2 px-3 py-1.5">
  <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] whitespace-nowrap">
    Stale after
  </span>
  <select
    value={editStaleThreshold}
    onChange={(e) => setEditStaleThreshold(Number(e.target.value))}
    onClick={(e) => e.stopPropagation()}
    className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 text-[11px] text-[var(--text-primary)] border border-[var(--border)] outline-none"
  >
    <option value={3}>3 days</option>
    <option value={7}>7 days</option>
    <option value={14}>14 days</option>
    <option value={30}>30 days</option>
    <option value={0}>Never</option>
  </select>
</div>
```

Add a state variable for the threshold:

```typescript
const [editStaleThreshold, setEditStaleThreshold] = useState<number>(7)
```

Update `handleStartEdit` to also load the current threshold:

```typescript
const handleStartEdit = (board: Board) => {
  setEditingId(board.id)
  setEditName(board.name)
  setEditStaleThreshold(board.staleDaysThreshold ?? 7)
}
```

Update `handleSaveEdit` to also save the threshold:

```typescript
const handleSaveEdit = () => {
  if (editingId && editName.trim()) {
    onUpdateBoard(editingId, {
      name: editName.trim(),
      staleDaysThreshold: editStaleThreshold,
    })
  }
  setEditingId(null)
  setEditName('')
}
```

**Step 2: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: add per-board stale threshold setting in board dropdown"
```

---

### Task 7: Manual Testing and Polish

**Files:**
- No new files — verification pass

**Step 1: Verify stale detection**

1. Open the app at localhost:3000
2. Ensure you have tasks in "Todo" or "In Progress" columns that were last updated more than 7 days ago
3. If not, temporarily change `DEFAULT_STALE_DAYS` to `0` in `useStaleTasks.ts` to force all non-backlog tasks to appear stale, then verify the three surfaces work

**Step 2: Verify sidebar widget**

1. Check the sidebar shows the "Stale Tasks" widget
2. Verify it lists stale tasks with title, board name, and relative time
3. Click "Snooze" — task should disappear from the widget
4. Refresh — task should stay snoozed (localStorage)

**Step 3: Verify board card indicators**

1. On the board view, stale tasks should have an amber left border
2. In compact mode, stale tasks should show an amber dot

**Step 4: Verify toast**

1. Hard refresh the page
2. If stale tasks exist, a toast should appear: "You have X tasks that haven't been touched in a while"
3. Refresh again — toast should NOT appear again (sessionStorage)
4. Open a new tab — toast should appear once in the new session

**Step 5: Verify board settings**

1. Click the board dropdown, edit a board
2. The "Stale after" dropdown should appear with the current threshold (default 7)
3. Change to "Never", save, verify stale indicators disappear for that board
4. Change to "3 days", save, verify more tasks may become stale

**Step 6: Revert any test changes and commit**

If you changed `DEFAULT_STALE_DAYS` for testing, revert it.

```bash
git add -A
git commit -m "chore: polish stale tasks feature after manual testing"
```

Only commit if there were actual fixes needed. If everything passed, no commit needed.
