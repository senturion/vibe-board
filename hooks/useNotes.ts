'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Note } from '@/lib/types'

export function useNotes() {
  const [note, setNote] = useLocalStorage<Note>('sidebar-note', {
    content: '',
    updatedAt: Date.now(),
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const updateNote = useCallback((content: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setNote({
        content,
        updatedAt: Date.now(),
      })
    }, 300)
  }, [setNote])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    note,
    updateNote,
  }
}
