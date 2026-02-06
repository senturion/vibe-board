import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOverdue, isDueSoon } from '../types'

describe('isOverdue', () => {
  beforeEach(() => {
    // Fix "now" to 2025-06-15 midnight
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a date in the past', () => {
    const yesterday = new Date(2025, 5, 14).getTime()
    expect(isOverdue(yesterday)).toBe(true)
  })

  it('returns false for today', () => {
    const today = new Date(2025, 5, 15).getTime()
    expect(isOverdue(today)).toBe(false)
  })

  it('returns false for a future date', () => {
    const tomorrow = new Date(2025, 5, 16).getTime()
    expect(isOverdue(tomorrow)).toBe(false)
  })
})

describe('isDueSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for today', () => {
    const today = new Date(2025, 5, 15).getTime()
    expect(isDueSoon(today)).toBe(true)
  })

  it('returns true for tomorrow', () => {
    const tomorrow = new Date(2025, 5, 16).getTime()
    expect(isDueSoon(tomorrow)).toBe(true)
  })

  it('returns true for day after tomorrow (within 2 days)', () => {
    const dayAfter = new Date(2025, 5, 17).getTime()
    expect(isDueSoon(dayAfter)).toBe(true)
  })

  it('returns false for 3 days from now', () => {
    const threeDays = new Date(2025, 5, 18).getTime()
    expect(isDueSoon(threeDays)).toBe(false)
  })

  it('returns false for a past date', () => {
    const yesterday = new Date(2025, 5, 14).getTime()
    expect(isDueSoon(yesterday)).toBe(false)
  })
})
