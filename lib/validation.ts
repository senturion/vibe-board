export interface ValidationResult {
  valid: boolean
  error?: string
}

// Email validation beyond HTML5 type="email"
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim()
  if (!trimmed) {
    return { valid: false, error: 'Email is required' }
  }
  // RFC 5322 simplified - covers real-world cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' }
  }
  return { valid: true }
}

// Password strength validation for signup
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must include a lowercase letter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must include an uppercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include a number' }
  }
  return { valid: true }
}

// Task title validation
export function validateTaskTitle(title: string): ValidationResult {
  const trimmed = title.trim()
  if (!trimmed) {
    return { valid: false, error: 'Task title is required' }
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'Task title must be less than 500 characters' }
  }
  return { valid: true }
}

// Task description validation
export function validateTaskDescription(description: string): ValidationResult {
  if (description.length > 10000) {
    return { valid: false, error: 'Description must be less than 10,000 characters' }
  }
  return { valid: true }
}
