import { describe, it, expect } from 'vitest'
import { dueDateFromDb, dueDateToDb, formatDateKey } from '../types'

describe('due dates are calendar dates', () => {
  it('reads the calendar day regardless of the stored time of day', () => {
    // Midnight UTC (date picker), noon UTC (goal planner) and late evening UTC
    // all name 20 November.
    for (const stored of [
      '2026-11-20T00:00:00.000Z',
      '2026-11-20T12:00:00.000Z',
      '2026-11-20T23:59:00+00:00',
    ]) {
      expect(formatDateKey(new Date(dueDateFromDb(stored)!))).toBe('2026-11-20')
    }
  })

  it('round-trips a local calendar day through the database format', () => {
    const local = new Date(2026, 10, 20).getTime()
    const stored = dueDateToDb(local)
    expect(stored).toBe('2026-11-20T00:00:00.000Z')
    expect(dueDateFromDb(stored)).toBe(local)
  })

  it('handles empty values', () => {
    expect(dueDateFromDb(null)).toBeUndefined()
    expect(dueDateFromDb('not a date')).toBeUndefined()
    expect(dueDateToDb(undefined)).toBeNull()
  })
})
