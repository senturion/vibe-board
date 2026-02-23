# Stale Tasks Resurfacing

## Problem

Tasks that haven't been touched in a while silently accumulate, leading to forgotten work and stale boards. There's no mechanism to flag or resurface neglected tasks.

## Solution

Client-side staleness detection based on `updatedAt` timestamps, surfaced through three layers: a sidebar widget, board card indicators, and a toast notification on page load. Per-board configurable thresholds. Quick actions (snooze, archive) to triage stale tasks without leaving the current view.

## Approach

All logic runs client-side. No new API routes or Supabase RPCs. Staleness is computed from the existing `KanbanTask.updatedAt` field (which falls back to `createdAt`). Snooze state lives in localStorage. Per-board thresholds are stored in a new `stale_days_threshold` column on the `boards` table.

## Data Model

### Board table change

Add column `stale_days_threshold` (integer, nullable). Null means default of 7 days.

### Board type change

```ts
interface Board {
  id: string
  name: string
  createdAt: number
  staleDaysThreshold?: number  // days, default 7
}
```

### Snooze state (localStorage)

Key: `vibe-stale-snooze`

```ts
Record<string, number>  // taskId -> snoozedUntilTimestamp
```

### Task type

No changes. Uses existing `updatedAt`, `completedAt`, `archivedAt`, `column`.

## Staleness Logic — `useStaleTasks` Hook

New hook: `hooks/useStaleTasks.ts`

Input: all tasks across boards, all boards.

Filtering rules:
1. Exclude tasks where `column === 'backlog'` or `column === 'complete'`
2. Exclude tasks with `completedAt` or `archivedAt` set
3. Look up the task's board `staleDaysThreshold` (default 7 days)
4. A task is stale if `Date.now() - task.updatedAt > threshold * 86400000`
5. Exclude tasks snoozed in localStorage where `snoozedUntil > Date.now()`

Returns:
- `staleTasks: KanbanTask[]` — sorted by stalest first
- `snoozeTask(id: string): void` — snoozes for 7 days
- `archiveTask(id: string): void` — delegates to existing kanban archive action
- `staleTaskIds: Set<string>` — for quick lookup by board indicators

## Surface 1: Sidebar Widget

Component: `components/sidebar/widgets/StaleMiniWidget.tsx`

- New `SidebarWidgetId`: `'stale'`
- Default visible: true
- Shows count badge + list of up to 5 stale tasks, sorted stalest first
- Each item: task title (clickable, navigates to board), board name, relative time ("12 days ago")
- Quick action buttons per item: Snooze (7 days), Archive
- Empty state: "All caught up" or similar

## Surface 2: Board Card Indicator

In `components/kanban/Card.tsx`:

- If task ID is in `staleTaskIds` set, render a small amber dot or left-border accent
- Subtle treatment — slightly muted opacity or a warm-toned indicator
- Tooltip on hover: "Stale — last updated X days ago"

The `staleTaskIds` set is passed down from the board component or provided via context.

## Surface 3: Toast Notification

On page load (in `app/page.tsx` or a wrapper component):

- If `staleTasks.length > 0` and not already shown this session (tracked via `sessionStorage` key `vibe-stale-toast-shown`)
- Show existing toast system with type `'info'`: "You have X tasks that haven't been touched in a while"
- Auto-dismisses in 3 seconds (existing behavior)

## Surface 4: Board Settings

In the board edit menu (Header.tsx board dropdown):

- Add a "Stale after" setting with presets: 3, 7, 14, 30 days, or "Never" (disables detection)
- Persisted to `boards.stale_days_threshold` via existing `updateBoard` flow
- "Never" maps to `null` with a flag or a sentinel value like `0`

## Excluded from Scope

- Server-side staleness computation
- Cross-entity staleness (goals, habits, routines)
- Snooze persistence in Supabase (can be added later)
- Custom snooze duration (hardcoded 7 days for now)
- Notifications/push for stale tasks
