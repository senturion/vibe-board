'use client'

import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
  mounted: boolean
}

export function ThemeToggle({ isDark, onToggle, mounted }: ThemeToggleProps) {
  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-[72px] h-8 bg-[var(--bg-tertiary)] border border-[var(--border)]" />
    )
  }

  return (
    <button
      onClick={onToggle}
      className="relative flex items-center w-[72px] h-8 bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors overflow-hidden"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sliding background */}
      <div
        className={cn(
          'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] transition-all duration-300 ease-out',
          isDark ? 'left-0.5' : 'left-[calc(50%+1px)]'
        )}
      />

      {/* Moon icon (dark) */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center w-1/2 h-full transition-colors duration-300',
          isDark ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
        )}
      >
        <Moon size={14} />
      </div>

      {/* Sun icon (light) */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center w-1/2 h-full transition-colors duration-300',
          !isDark ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
        )}
      >
        <Sun size={14} />
      </div>
    </button>
  )
}
