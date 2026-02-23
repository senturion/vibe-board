# Habits Refresh Design

## Summary

Enhance the habits system with: (1) build vs avoid habit types with per-habit tracking mode choice, (2) Lucide icon picker for habits, (3) calendar month view redesign with icons and visual clarity improvements.

## Approach

**Approach A: Incremental enhancement.** Add new fields to the existing Habit model, extend the editor, update calendar cell rendering, and adjust streak/completion logic. Leverages existing shared temporal navigation components.

## Data Model Changes

Add to `Habit` interface:
- `habitType: 'build' | 'avoid'` — defaults to `'build'`
- `trackingMode: 'manual' | 'auto-complete'` — only relevant for avoid habits. Build habits always use manual.
- `icon` field already exists as `icon?: string` — populate with Lucide icon name (e.g. `'dumbbell'`, `'book'`)

No database migration needed — add as nullable columns defaulting to `'build'` and `'manual'`. Existing habits unaffected.

## Icon System

### Icon Picker (in HabitEditor)

Compact grid of ~35 curated Lucide icons after the color picker. Same accent-ring selection style as color picker. ~24px icons.

**Categories:**
- Fitness: Dumbbell, Bike, Footprints, Heart, Activity
- Wellness: Moon, Sun, Droplets, Apple, Leaf
- Mind: Book, BookOpen, Brain, Pencil, GraduationCap
- Social: Users, MessageCircle, Phone, HandHeart
- Productivity: Clock, Target, Zap, CheckSquare, ListTodo
- Avoid: Ban, ShieldX, CircleOff, XCircle, Coffee, Wine, Cigarette, Smartphone

Default icon inferred from habit name if none selected, or generic fallback.

## Calendar Month View Redesign

Replace colored bars with icon-based cells:

- Each day shows up to 4 small (14px) habit icons colored with the habit's color
- Completed: solid icon. Missed/incomplete: faded (opacity 0.3)
- More than 4 habits: show "+N" text
- Avoid habit icons get a tiny overlay badge for distinction
- Day completion borders: all done → subtle green left border, none done → subtle red-ish left border, partial → neutral

Day/Week views also updated to show Lucide icons next to habit names.

Existing interactions preserved: click day → day view, temporal navigation unchanged.

## Avoid Habit Logic

### Completion Behavior

**Auto-complete mode (`trackingMode: 'auto-complete'`):**
- Day starts as "successful" (no action needed)
- User taps to mark a slip → creates a completion record
- Tap again removes the slip
- UI: untouched = green "Clean", slipped = muted warning "Slipped"

**Manual mode (`trackingMode: 'manual'`):**
- User confirms avoidance each day → creates completion record
- No record = not tracked yet
- UI: confirmed = "Confirmed", untracked = "Not tracked"

### Streak Calculation

- Auto-complete: streak = consecutive days with NO completion records (no slips)
- Manual: streak = consecutive days WITH completion records (confirmed avoidance)

### Analytics

Completion rate reframed as "success rate" for avoid habits — percentage of days successfully avoided.

## Habit Editor Updates

**Habit Type selector** — at top, before name field:
- "Build" (default) — "Do something regularly"
- "Avoid" — "Stop doing something"

**Tracking Mode** — appears when "Avoid" selected:
- "Mark failures" (auto-complete)
- "Confirm daily" (manual)

When type is "Avoid": targetCount hidden (always 1).

**Icon picker** — after color picker. Compact grid, accent-ring on selection.

## HabitCard Changes

- Build: checkbox toggles completion, shows "Done" / count
- Avoid (auto-complete): button toggles slip, shows "Clean" or "Slipped"
- Avoid (manual): checkbox toggles confirmation, shows "Confirmed" or "Not tracked"
- Subtle visual distinction: avoid habits show a small indicator badge
