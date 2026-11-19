import type { Habit, HabitCompletion } from '@/lib/types'

/** Above this many per day, a ring split into segments is too fine to read, so it fills smoothly instead. */
export const MAX_RING_SEGMENTS = 8

/** Today's progress toward a habit's per-day target (not the weekly goal). */
export function dayProgress(
  habit: Pick<Habit, 'id' | 'targetCount'>,
  completions: Pick<HabitCompletion, 'habitId' | 'completionDate' | 'count'>[],
  dateKey: string,
) {
  const target = Math.max(habit.targetCount || 1, 1)
  const count = completions
    .filter(c => c.habitId === habit.id && c.completionDate === dateKey)
    .reduce((sum, c) => sum + c.count, 0)
  return { count, target, isComplete: count >= target }
}

export interface RingArc {
  d: string
  filled: boolean
}

function point(c: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return `${(c + r * Math.cos(rad)).toFixed(2)} ${(c + r * Math.sin(rad)).toFixed(2)}`
}

function arc(c: number, r: number, from: number, to: number) {
  const large = to - from > 180 ? 1 : 0
  return `M${point(c, r, from)} A${r} ${r} 0 ${large} 1 ${point(c, r, to)}`
}

/**
 * The paths that draw an unfinished habit's ring on a 24×24 box: one segment
 * per log for small targets, or a background ring plus a progress arc for
 * large ones.
 */
export function ringArcs(count: number, target: number): RingArc[] {
  const c = 12
  const r = 9
  const full = `M${c} ${c - r} A${r} ${r} 0 1 1 ${c} ${c + r} A${r} ${r} 0 1 1 ${c} ${c - r}`
  const done = Math.max(0, Math.min(count, target))

  if (target <= 1) return [{ d: full, filled: false }]

  if (target > MAX_RING_SEGMENTS) {
    const arcs: RingArc[] = [{ d: full, filled: false }]
    if (done > 0) arcs.push({ d: arc(c, r, 0, (done / target) * 359.9), filled: true })
    return arcs
  }

  const step = 360 / target
  const gap = target > 4 ? 22 : 18
  return Array.from({ length: target }, (_, i) => ({
    d: arc(c, r, i * step + gap / 2, (i + 1) * step - gap / 2),
    filled: i < done,
  }))
}

/** What a screen reader hears for a habit's tap target. */
export function habitActionLabel(name: string, count: number, target: number) {
  if (count >= target) return `${name}, done. Tap to reset for today`
  if (target > 1) return `${name}, ${count} of ${target}. Tap to log one`
  return `${name}. Tap to mark done`
}
