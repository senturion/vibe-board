'use client'

import { useState, useEffect } from 'react'
import { useNotes } from '@/hooks/useNotes'

interface NotesProps {
  compact?: boolean
}

export function Notes({ compact = false }: NotesProps) {
  const { note, updateNote } = useNotes()
  const [localContent, setLocalContent] = useState('')

  useEffect(() => {
    const syncTimeout = setTimeout(() => {
      setLocalContent(note.content)
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [note.content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setLocalContent(value)
    updateNote(value)
  }

  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0

  if (compact) {
    return (
      <div>
        <textarea
          value={localContent}
          onChange={handleChange}
          placeholder="Quick notes..."
          className="w-full h-[120px] bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-relaxed"
        />
        {wordCount > 0 && (
          <p className="text-[9px] text-[var(--text-tertiary)] mt-1">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-lg text-[var(--text-primary)] italic">Notes</h3>
        {wordCount > 0 && (
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>

      {/* Decorative line */}
      <div className="h-px w-8 bg-[var(--success)] mb-4" />

      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          value={localContent}
          onChange={handleChange}
          placeholder="Capture your thoughts..."
          className="absolute inset-0 w-full h-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:italic outline-none resize-none leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* Auto-save indicator */}
      {note.updatedAt > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            Last saved {new Date(note.updatedAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  )
}
