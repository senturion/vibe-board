import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword, validateTaskTitle, validateTaskDescription } from '../validation'

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com').valid).toBe(true)
    expect(validateEmail('test.user+tag@domain.co.uk').valid).toBe(true)
  })

  it('rejects empty email', () => {
    const result = validateEmail('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('rejects whitespace-only email', () => {
    expect(validateEmail('   ').valid).toBe(false)
  })

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com').valid).toBe(false)
  })

  it('rejects email without domain', () => {
    expect(validateEmail('user@').valid).toBe(false)
  })

  it('rejects email without TLD', () => {
    expect(validateEmail('user@domain').valid).toBe(false)
  })

  it('rejects excessively long email', () => {
    const longEmail = 'a'.repeat(250) + '@b.com'
    expect(validateEmail(longEmail).valid).toBe(false)
  })

  it('trims whitespace before validating', () => {
    expect(validateEmail('  user@example.com  ').valid).toBe(true)
  })
})

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('MyPass123').valid).toBe(true)
  })

  it('rejects empty password', () => {
    const result = validatePassword('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Password is required')
  })

  it('rejects short passwords', () => {
    const result = validatePassword('Ab1')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least 8')
  })

  it('rejects passwords over 128 characters', () => {
    const long = 'Aa1' + 'x'.repeat(126)
    expect(validatePassword(long).valid).toBe(false)
  })

  it('rejects password without lowercase', () => {
    const result = validatePassword('ABCDEFG123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('lowercase')
  })

  it('rejects password without uppercase', () => {
    const result = validatePassword('abcdefg123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('uppercase')
  })

  it('rejects password without number', () => {
    const result = validatePassword('Abcdefgh')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('number')
  })
})

describe('validateTaskTitle', () => {
  it('accepts valid titles', () => {
    expect(validateTaskTitle('Fix the login bug').valid).toBe(true)
  })

  it('rejects empty title', () => {
    const result = validateTaskTitle('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Task title is required')
  })

  it('rejects whitespace-only title', () => {
    expect(validateTaskTitle('   ').valid).toBe(false)
  })

  it('rejects title over 500 characters', () => {
    const long = 'a'.repeat(501)
    expect(validateTaskTitle(long).valid).toBe(false)
  })

  it('accepts title at exactly 500 characters', () => {
    expect(validateTaskTitle('a'.repeat(500)).valid).toBe(true)
  })
})

describe('validateTaskDescription', () => {
  it('accepts valid descriptions', () => {
    expect(validateTaskDescription('Some description here').valid).toBe(true)
  })

  it('accepts empty description', () => {
    expect(validateTaskDescription('').valid).toBe(true)
  })

  it('rejects description over 10000 characters', () => {
    const long = 'a'.repeat(10001)
    expect(validateTaskDescription(long).valid).toBe(false)
  })

  it('accepts description at exactly 10000 characters', () => {
    expect(validateTaskDescription('a'.repeat(10000)).valid).toBe(true)
  })
})
