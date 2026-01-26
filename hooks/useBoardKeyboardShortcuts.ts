'use client'

import { useEffect } from 'react'

interface UseBoardKeyboardShortcutsOptions {
  /** Whether shortcuts are disabled (e.g., when modals are open) */
  disabled?: boolean
  /** Called when 'n' or Cmd+K is pressed */
  onQuickCapture?: () => void
  /** Called when '?' is pressed */
  onShowShortcuts?: () => void
  /** Called when 'a' is pressed */
  onShowArchive?: () => void
  /** Called when '/' is pressed */
  onShowSearch?: () => void
}

export function useBoardKeyboardShortcuts({
  disabled = false,
  onQuickCapture,
  onShowShortcuts,
  onShowArchive,
  onShowSearch,
}: UseBoardKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Don't trigger when disabled (e.g., modals are open)
      if (disabled) {
        return
      }

      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onQuickCapture?.()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onQuickCapture?.()
      } else if (e.key === '?') {
        e.preventDefault()
        onShowShortcuts?.()
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onShowArchive?.()
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onShowSearch?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, onQuickCapture, onShowShortcuts, onShowArchive, onShowSearch])
}

interface UseCloseOnKeyOptions {
  /** Whether the listener is active */
  isOpen: boolean
  /** Called when any key is pressed */
  onClose: () => void
}

/**
 * Closes something when any key is pressed (used for keyboard shortcuts overlay)
 */
export function useCloseOnAnyKey({ isOpen, onClose }: UseCloseOnKeyOptions) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = () => onClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}
