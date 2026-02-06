import { describe, it, expect } from 'vitest'
import { generateId, cn } from '../utils'

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('returns a valid UUID format', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, 'b', undefined, null, 'c')).toBe('a b c')
  })

  it('returns empty string for no truthy values', () => {
    expect(cn(false, undefined, null)).toBe('')
  })

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('')
  })
})
