# Task Focus Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "focus on task" mode — promote any kanban task to a dedicated working view with pomodoro timer, subtask breakdown, and a persistent focus bar across all views.

**Architecture:** Global `focusedTaskId` state persisted in `user_ui_state` (Supabase). New `useFocusTask` hook manages focus lifecycle. Focus page conditionally renders task+timer two-panel layout. Persistent `FocusBar` component renders in root page layout. No new DB tables.

**Tech Stack:** React 19, Next.js 16, TypeScript, Supabase, Tailwind CSS, Lucide icons

---

### Task 1: Add `focusedTaskId` to UI State

**Files:**
- Modify: `lib/types.ts:502-526` (UserUIState interface + default)
- Modify: `hooks/useUIState.ts:72-86` (cloud load mapping)
- Modify: `hooks/useUIState.ts:120-148` (cloud sync mapping)
- Modify: `contexts/UIStateContext.tsx:11-32` (context type)

**Step 1: Add `focusedTaskId` to UserUIState type**

In `lib/types.ts`, add `focusedTaskId` to the `UserUIState` interface:

```typescript
export interface UserUIState {
  activeView: ViewId
  widgetStates: Record<string, { collapsed: boolean }>
  sectionViewModes: Record<TemporalSectionId, SectionViewMode>
  sectionSelectedDates: Record<TemporalSectionId, string>
  sidebarCollapsed: boolean
  focusedTaskId: string | null
}

export const DEFAULT_UI_STATE: UserUIState = {
  activeView: 'dashboard',
  widgetStates: {},
  sectionViewModes: {
    habits: 'list',
    goals: 'list',
    routines: 'list',
    board: 'list',
  },
  sectionSelectedDates: {
    habits: formatDateKey(),
    goals: formatDateKey(),
    routines: formatDateKey(),
    board: formatDateKey(),
  },
  sidebarCollapsed: false,
  focusedTaskId: null,
}
```

**Step 2: Add cloud load/sync for `focusedTaskId` in useUIState.ts**

In `hooks/useUIState.ts`, update the `loadFromCloud` mapping (~line 73) to include:
```typescript
focusedTaskId: (data.focused_task_id as string) || null,
```

In the `syncToCloud` function (~line 120), add:
```typescript
if (updateData.focusedTaskId !== undefined) {
  dbData.focused_task_id = updateData.focusedTaskId
}
```

Add `setFocusedTaskId` and `focusedTaskId` to the return object, plus a new setter:
```typescript
const setFocusedTaskId = useCallback((taskId: string | null) => {
  updateState({ focusedTaskId: taskId })
}, [updateState])
```

**Step 3: Add to UIStateContext**

In `contexts/UIStateContext.tsx`, add to the `UIStateContextType` interface:
```typescript
focusedTaskId: string | null
setFocusedTaskId: (taskId: string | null) => void
```

**Step 4: Add DB column**

Run this migration in Supabase:
```sql
ALTER TABLE public.user_ui_state
  ADD COLUMN IF NOT EXISTS focused_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
```

Also update `supabase-schema.sql` to include the new column.

**Step 5: Verify**

Run: `npm run build`
Expected: Compiles cleanly (the new field is nullable, so existing code won't break).

**Step 6: Commit**

```bash
git add lib/types.ts hooks/useUIState.ts contexts/UIStateContext.tsx supabase-schema.sql
git commit -m "feat: add focusedTaskId to UI state with Supabase persistence"
```

---

### Task 2: Create `useFocusTask` hook

**Files:**
- Create: `hooks/useFocusTask.ts`

**Step 1: Write the hook**

This hook provides the focus task lifecycle: enter focus, exit focus, get the focused task data. It coordinates between UIState (for the ID), useKanban (for task data + move), useNavigation (for nav), and useFocusTimer (for linking).

```typescript
'use client'

import { useCallback, useState } from 'react'
import { useUIStateContext } from '@/contexts/UIStateContext'
import { useNavigation } from '@/contexts/NavigationContext'
import { KanbanTask } from '@/lib/types'

interface UseFocusTaskOptions {
  tasks: KanbanTask[]
  moveTask: (taskId: string, column: KanbanTask['column']) => Promise<void>
  linkToTask: (taskId: string) => void
  clearLinks: () => void
  stop: () => Promise<void>
  isRunning: boolean
}

export function useFocusTask({
  tasks,
  moveTask,
  linkToTask,
  clearLinks,
  stop: stopTimer,
  isRunning,
}: UseFocusTaskOptions) {
  const { focusedTaskId, setFocusedTaskId } = useUIStateContext()
  const { setActiveView } = useNavigation()
  const [showStopPrompt, setShowStopPrompt] = useState(false)

  const focusedTask = focusedTaskId
    ? tasks.find(t => t.id === focusedTaskId) || null
    : null

  const focusOnTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Auto-move to in-progress if not already there
    if (task.column !== 'in-progress') {
      await moveTask(taskId, 'in-progress')
    }

    // Set focused task and link timer
    setFocusedTaskId(taskId)
    linkToTask(taskId)

    // Navigate to focus page
    setActiveView('focus')
  }, [tasks, moveTask, setFocusedTaskId, linkToTask, setActiveView])

  const requestStopFocus = useCallback(() => {
    setShowStopPrompt(true)
  }, [])

  const confirmStopFocus = useCallback(async (action: 'complete' | 'in-progress' | 'todo') => {
    if (focusedTaskId) {
      if (action === 'complete') {
        await moveTask(focusedTaskId, 'complete')
      } else if (action === 'todo') {
        await moveTask(focusedTaskId, 'todo')
      }
      // 'in-progress' = no move needed
    }

    // Stop timer if running
    if (isRunning) {
      await stopTimer()
    }

    // Clear focus state
    clearLinks()
    setFocusedTaskId(null)
    setShowStopPrompt(false)
  }, [focusedTaskId, moveTask, isRunning, stopTimer, clearLinks, setFocusedTaskId])

  const cancelStopFocus = useCallback(() => {
    setShowStopPrompt(false)
  }, [])

  return {
    focusedTaskId,
    focusedTask,
    focusOnTask,
    requestStopFocus,
    confirmStopFocus,
    cancelStopFocus,
    showStopPrompt,
  }
}
```

**Step 2: Verify**

Run: `npm run build`
Expected: Compiles (hook not used yet, but imports should resolve).

**Step 3: Commit**

```bash
git add hooks/useFocusTask.ts
git commit -m "feat: add useFocusTask hook for focus mode lifecycle"
```

---

### Task 3: Create `StopFocusPrompt` component

**Files:**
- Create: `components/focus/StopFocusPrompt.tsx`
- Modify: `components/focus/index.ts` (add export)

**Step 1: Write the component**

A small modal with three buttons matching the app's existing modal style (see CardDetailModal for reference).

```typescript
'use client'

import { X, Check, ArrowRight, Undo2 } from 'lucide-react'

interface StopFocusPromptProps {
  isOpen: boolean
  onConfirm: (action: 'complete' | 'in-progress' | 'todo') => void
  onCancel: () => void
}

export function StopFocusPrompt({ isOpen, onConfirm, onCancel }: StopFocusPromptProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/50 z-50 animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--text-secondary)] font-medium">
            Stop Focusing
          </p>
          <button
            onClick={onCancel}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={() => onConfirm('complete')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--success)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--success)] transition-colors"
          >
            <Check size={16} />
            Mark Complete
          </button>
          <button
            onClick={() => onConfirm('in-progress')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <ArrowRight size={16} />
            Keep in Progress
          </button>
          <button
            onClick={() => onConfirm('todo')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <Undo2 size={16} />
            Back to Todo
          </button>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Update index.ts**

Add to `components/focus/index.ts`:
```typescript
export { StopFocusPrompt } from './StopFocusPrompt'
```

**Step 3: Verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add components/focus/StopFocusPrompt.tsx components/focus/index.ts
git commit -m "feat: add StopFocusPrompt modal for exiting focus mode"
```

---

### Task 4: Create `FocusTaskPanel` component

**Files:**
- Create: `components/focus/FocusTaskPanel.tsx`
- Modify: `components/focus/index.ts` (add export)

**Step 1: Write the component**

The left panel showing the focused task details and subtasks. Reuses patterns from CardDetailModal for subtask rendering.

```typescript
'use client'

import { useState, useRef } from 'react'
import { Plus, X, Check, Flag, Clock, Crosshair, ListChecks } from 'lucide-react'
import { KanbanTask, Priority, PRIORITIES, LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FocusTaskPanelProps {
  task: KanbanTask
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  onAddSubtask: (taskId: string, text: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onStopFocus: () => void
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function FocusTaskPanel({
  task,
  onUpdate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onStopFocus,
}: FocusTaskPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [newSubtask, setNewSubtask] = useState('')
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const totalSubtasks = subtasks.length
  const priorityColor = PRIORITY_COLORS[task.priority || 'medium']
  const taskLabels = LABELS.filter(l => (task.labels || []).includes(l.id))

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== (task.description || '')) {
      onUpdate(task.id, { description: description || undefined })
    }
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim())
      setNewSubtask('')
      subtaskInputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Crosshair size={16} className="text-[var(--accent)] shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Focusing
        </p>
      </div>

      {/* Title */}
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleTitleBlur()
          }
        }}
        placeholder="Task title..."
        rows={1}
        className="w-full bg-transparent font-display text-2xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-tight mb-4"
        style={{ minHeight: '2rem' }}
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        placeholder="Add a description..."
        rows={2}
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:italic outline-none resize-none leading-relaxed focus:border-[var(--text-tertiary)] transition-colors mb-6"
      />

      {/* Subtasks */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="text-[var(--text-tertiary)]" />
            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              Subtasks
            </label>
          </div>
          {totalSubtasks > 0 && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSubtasks > 0 && (
          <div className="h-1 bg-[var(--bg-tertiary)] mb-4 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        )}

        {/* Subtask list */}
        <div className="space-y-1 mb-3">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="group flex items-center gap-3 py-2 px-3 -mx-3 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <button
                onClick={() => onToggleSubtask(task.id, subtask.id)}
                className={cn(
                  'w-4 h-4 border flex items-center justify-center shrink-0 transition-all',
                  subtask.completed
                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                    : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'
                )}
              >
                {subtask.completed && <Check size={10} className="text-[var(--bg-primary)]" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  'flex-1 text-[13px]',
                  subtask.completed
                    ? 'text-[var(--text-tertiary)] line-through'
                    : 'text-[var(--text-primary)]'
                )}
              >
                {subtask.text}
              </span>
              <button
                onClick={() => onDeleteSubtask(task.id, subtask.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add subtask */}
        <div className="flex items-center gap-2">
          <input
            ref={subtaskInputRef}
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask()
            }}
            placeholder="Add a subtask..."
            className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border-b border-[var(--border)] py-2 focus:border-[var(--text-tertiary)] transition-colors"
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtask.trim()}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <span
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: priorityColor }}
        >
          <Flag size={10} fill={task.priority === 'urgent' || task.priority === 'high' ? priorityColor : 'none'} />
          {task.priority || 'Medium'}
        </span>
        {taskLabels.map(label => (
          <span
            key={label.id}
            className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.05em] font-medium"
            style={{ color: label.color, backgroundColor: label.bg }}
          >
            {label.label}
          </span>
        ))}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <Clock size={10} />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Stop Focusing */}
      <button
        onClick={onStopFocus}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X size={14} />
        Stop Focusing
      </button>
    </div>
  )
}
```

**Step 2: Update index.ts**

Add to `components/focus/index.ts`:
```typescript
export { FocusTaskPanel } from './FocusTaskPanel'
```

**Step 3: Verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add components/focus/FocusTaskPanel.tsx components/focus/index.ts
git commit -m "feat: add FocusTaskPanel component for focused task details"
```

---

### Task 5: Update FocusPage for two-panel layout

**Files:**
- Modify: `components/focus/FocusPage.tsx`

**Step 1: Update FocusPage**

The FocusPage needs to accept focus task props and conditionally render the two-panel layout. When `focusedTask` is set, show task panel on left + timer on right. When null, show the existing standalone timer.

Key changes:
- Accept new props: `focusedTask`, `onUpdate`, `onAddSubtask`, `onToggleSubtask`, `onDeleteSubtask`, `onStopFocus`
- When `focusedTask` is set: render `<div className="flex-1 flex flex-col lg:flex-row">` with FocusTaskPanel on left and timer on right
- When null: render existing layout unchanged
- Auto-link timer to focused task via the existing `linkToTask` (already done in useFocusTask)

The FocusPage component will receive these props from `app/page.tsx` where the hooks are wired together.

```typescript
// New props interface
interface FocusPageProps {
  focusedTask?: KanbanTask | null
  onUpdateTask?: (id: string, updates: Partial<KanbanTask>) => void
  onAddSubtask?: (taskId: string, text: string) => void
  onToggleSubtask?: (taskId: string, subtaskId: string) => void
  onDeleteSubtask?: (taskId: string, subtaskId: string) => void
  onStopFocus?: () => void
}
```

When `focusedTask` is provided, the layout becomes:
- Two-panel on desktop (lg breakpoint): left = FocusTaskPanel, right = timer column
- Stacked on mobile: task panel on top, timer below

The timer column reuses the exact same timer JSX from the existing FocusPage (timer circle, controls, stats, sessions list). Extract it into a local `TimerSection` component within the file for cleanliness.

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add components/focus/FocusPage.tsx
git commit -m "feat: update FocusPage with conditional two-panel task+timer layout"
```

---

### Task 6: Create `FocusBar` persistent component

**Files:**
- Create: `components/focus/FocusBar.tsx`
- Modify: `components/focus/index.ts` (add export)

**Step 1: Write the component**

A compact bar (~40px) that shows below the header on all views except focus. Shows task title, subtask progress, timer, and controls.

```typescript
'use client'

import { Crosshair, Pause, Play, X, ListChecks } from 'lucide-react'
import { KanbanTask } from '@/lib/types'

interface FocusBarProps {
  task: KanbanTask
  timeRemaining: number
  isRunning: boolean
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onNavigateToFocus: () => void
  onStopFocus: () => void
}

export function FocusBar({
  task,
  timeRemaining,
  isRunning,
  isPaused,
  onPause,
  onResume,
  onNavigateToFocus,
  onStopFocus,
}: FocusBarProps) {
  const subtasks = task.subtasks || []
  const completed = subtasks.filter(s => s.completed).length
  const total = subtasks.length

  const mins = Math.floor(timeRemaining / 60)
  const secs = timeRemaining % 60
  const timeDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
      {/* Focus indicator + task title */}
      <button
        onClick={onNavigateToFocus}
        className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
      >
        <Crosshair size={14} className="text-[var(--accent)] shrink-0" />
        <span className="text-[12px] text-[var(--text-primary)] truncate">
          {task.title}
        </span>
      </button>

      {/* Subtask progress */}
      {total > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <ListChecks size={12} className="text-[var(--text-tertiary)]" />
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {completed}/{total}
          </span>
          <div className="w-16 h-1 bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Timer */}
      <span className="text-[12px] font-mono text-[var(--text-secondary)] shrink-0 tabular-nums">
        {isRunning ? timeDisplay : 'Ready'}
      </span>

      {/* Pause/Resume */}
      {isRunning && (
        <button
          onClick={isPaused ? onResume : onPause}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}

      {/* Stop focus */}
      <button
        onClick={onStopFocus}
        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/30 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  )
}
```

**Step 2: Update index.ts**

Add export for `FocusBar`.

**Step 3: Verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add components/focus/FocusBar.tsx components/focus/index.ts
git commit -m "feat: add persistent FocusBar component for cross-view focus indicator"
```

---

### Task 7: Wire everything together in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Step 1: Integrate focus mode**

This is the main integration task. In `app/page.tsx`:

1. Import `useFocusTask`, `FocusBar`, `StopFocusPrompt`, and the updated `FocusPage`
2. Call `useFocusTimer()` at the page level (currently called inside FocusPage — needs to be lifted up so FocusBar can access timer state)
3. Call `useFocusTask()` passing in tasks, moveTask, linkToTask, clearLinks, stop, isRunning
4. Render `FocusBar` between the header and content when `focusedTask` is set AND `activeView !== 'focus'`
5. Pass focus props to `FocusPage` in the `renderContent` switch
6. Render `StopFocusPrompt` at the bottom of the component
7. Pass `focusOnTask` down to `Board` as a prop (so cards can trigger focus)

The key changes:
- `useFocusTimer()` gets lifted from `FocusPage` to `app/page.tsx`
- `FocusPage` receives timer state + focus task as props instead of calling `useFocusTimer` internally
- `useKanban` already returns `moveTask`, `addSubtask`, `toggleSubtask`, `deleteSubtask`, `updateTask`

**Step 2: Verify**

Run: `npm run build`
Then run: `npm run dev` and manually test that the focus page still renders the standalone timer correctly.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire focus mode into main page with FocusBar and StopFocusPrompt"
```

---

### Task 8: Add focus button to Kanban Card and CardDetailModal

**Files:**
- Modify: `components/kanban/Card.tsx`
- Modify: `components/kanban/CardDetailModal.tsx`
- Modify: `components/kanban/Board.tsx` (pass `onFocusTask` prop through)

**Step 1: Update Card.tsx**

Add a new prop `onFocusTask?: (taskId: string) => void` and `focusedTaskId?: string | null` to `CardProps`.

In **full mode** footer (line ~227, between priority and subtasks count):
```typescript
<button
  onClick={(e) => {
    e.stopPropagation()
    onFocusTask?.(task.id)
  }}
  className={cn(
    'p-1 transition-colors',
    focusedTaskId === task.id
      ? 'text-[var(--accent)]'
      : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'
  )}
  title={focusedTaskId === task.id ? 'Currently focusing' : 'Focus on this task'}
>
  <Crosshair size={12} />
</button>
```

In **compact mode** (hover area near delete button):
Add the same crosshair button with `opacity-0 group-hover:opacity-100`.

Hide the focus button if `task.archivedAt` is set.

**Step 2: Update CardDetailModal.tsx**

Add `onFocusTask?: (taskId: string) => void` and `focusedTaskId?: string | null` to props.

In the metadata row (line ~192, after column selector):
```typescript
<button
  onClick={() => {
    onFocusTask?.(task.id)
    onClose()
  }}
  className={cn(
    'flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border transition-colors',
    focusedTaskId === task.id
      ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-glow)]'
      : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
  )}
>
  <Crosshair size={12} />
  {focusedTaskId === task.id ? 'Focusing' : 'Focus'}
</button>
```

Don't show the button for archived tasks.

**Step 3: Thread `onFocusTask` prop through Board.tsx**

The `Board` component renders `Card` and `CardDetailModal`. Add `onFocusTask` and `focusedTaskId` props to `Board` and pass them down to the card components.

**Step 4: Verify**

Run: `npm run build`
Then `npm run dev` — verify crosshair buttons appear on cards. Click one and confirm it navigates to focus page with the task loaded.

**Step 5: Commit**

```bash
git add components/kanban/Card.tsx components/kanban/CardDetailModal.tsx components/kanban/Board.tsx
git commit -m "feat: add focus button to kanban cards and detail modal"
```

---

### Task 9: Update FocusPage to accept timer as props

**Files:**
- Modify: `components/focus/FocusPage.tsx`

**Step 1: Refactor FocusPage to accept timer props**

Since we lifted `useFocusTimer` to `page.tsx` in Task 7, FocusPage now needs to receive timer state as props instead of calling the hook internally. Update FocusPage to:

1. Remove the internal `useFocusTimer()` call
2. Accept all timer state and controls as props
3. Keep all existing rendering logic — just change the data source from hook to props

The props interface:
```typescript
interface FocusPageProps {
  // Timer (all from useFocusTimer)
  isRunning: boolean
  isPaused: boolean
  timeRemaining: number
  currentSessionType: SessionType
  sessionsCompleted: number
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  skip: () => void
  reset: () => void
  settings: FocusSettings
  updateSettings: (s: Partial<FocusSettings>) => void
  loading: boolean
  getTodaysFocusTime: () => number
  getWeeklyFocusTime: () => number
  sessions: FocusSession[]
  // Focus task (optional)
  focusedTask?: KanbanTask | null
  onUpdateTask?: (id: string, updates: Partial<KanbanTask>) => void
  onAddSubtask?: (taskId: string, text: string) => void
  onToggleSubtask?: (taskId: string, subtaskId: string) => void
  onDeleteSubtask?: (taskId: string, subtaskId: string) => void
  onStopFocus?: () => void
}
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add components/focus/FocusPage.tsx
git commit -m "refactor: FocusPage accepts timer and focus task as props"
```

---

### Task 10: Database migration + end-to-end test

**Files:**
- Modify: `supabase-schema.sql` (already done conceptually in Task 1, ensure it's applied)

**Step 1: Apply the migration**

Run in Supabase SQL editor (or via the MCP tool):
```sql
ALTER TABLE public.user_ui_state
  ADD COLUMN IF NOT EXISTS focused_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
```

**Step 2: Manual end-to-end test**

Run `npm run dev` and verify the full flow:

1. Navigate to Board view — see kanban cards with crosshair icon
2. Click crosshair on a task — navigates to Focus page, task appears in left panel, timer on right
3. Task auto-moved to "in-progress" column
4. Add subtasks in the focus panel — they persist
5. Start timer — it counts down, linked to the task
6. Navigate to another view (e.g., Habits) — FocusBar appears at top with task title, timer, progress
7. Click task title in bar — returns to Focus page
8. Click pause in bar — timer pauses
9. Click X in bar or "Stop Focusing" — StopFocusPrompt appears
10. Choose "Mark Complete" — task moves to complete column, focus clears
11. Visit Focus page with no focused task — standalone timer works as before

**Step 3: Commit**

```bash
git add supabase-schema.sql
git commit -m "chore: add focused_task_id column to user_ui_state schema"
```

---

## Implementation Notes

- **No new DB tables.** The only schema change is one nullable column on `user_ui_state`.
- **`useFocusTimer` is lifted** from FocusPage to page.tsx so both FocusPage and FocusBar can share timer state. This is the biggest structural change.
- **Backwards compatible.** When `focusedTaskId` is null, everything renders exactly as before.
- **Task 5 and Task 9 overlap** — they both modify FocusPage.tsx. Task 5 adds the two-panel layout structure, Task 9 refactors it to accept props. They can be done as one combined step if preferred.
