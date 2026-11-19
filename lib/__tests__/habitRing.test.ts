import { describe, expect, it } from 'vitest'
import { dayProgress, habitActionLabel, ringArcs, MAX_RING_SEGMENTS } from '../habitRing'

describe('dayProgress', () => {
  const habit = { id: 'h1', targetCount: 3 }
  const completions = [
    { habitId: 'h1', completionDate: '2026-11-19', count: 1 },
    { habitId: 'h1', completionDate: '2026-11-19', count: 1 },
    { habitId: 'h1', completionDate: '2026-11-18', count: 1 },
    { habitId: 'h2', completionDate: '2026-11-19', count: 1 },
  ]

  it('counts only that habit on that day', () => {
    expect(dayProgress(habit, completions, '2026-11-19')).toEqual({ count: 2, target: 3, isComplete: false })
  })

  it('is complete once the target is reached', () => {
    expect(dayProgress({ id: 'h2', targetCount: 1 }, completions, '2026-11-19').isComplete).toBe(true)
  })

  it('treats a missing target as one', () => {
    expect(dayProgress({ id: 'h9', targetCount: 0 }, [], '2026-11-19').target).toBe(1)
  })
})

describe('ringArcs', () => {
  it('draws one plain ring for a yes/no habit', () => {
    expect(ringArcs(0, 1)).toEqual([{ d: expect.any(String), filled: false }])
  })

  it('draws one segment per log and fills the logged ones', () => {
    const arcs = ringArcs(2, 5)
    expect(arcs).toHaveLength(5)
    expect(arcs.map(a => a.filled)).toEqual([true, true, false, false, false])
  })

  it('switches to a smooth arc above the segment limit', () => {
    const target = MAX_RING_SEGMENTS + 2
    expect(ringArcs(0, target)).toHaveLength(1)
    const arcs = ringArcs(3, target)
    expect(arcs).toHaveLength(2)
    expect(arcs[1].filled).toBe(true)
  })

  it('never fills more segments than the target', () => {
    expect(ringArcs(9, 3).every(a => a.filled)).toBe(true)
  })
})

describe('habitActionLabel', () => {
  it('says what a tap will do', () => {
    expect(habitActionLabel('Read', 1, 5)).toBe('Read, 1 of 5. Tap to log one')
    expect(habitActionLabel('Meditate', 0, 1)).toBe('Meditate. Tap to mark done')
    expect(habitActionLabel('Read', 5, 5)).toBe('Read, done. Tap to reset for today')
  })
})
