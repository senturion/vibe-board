'use client'

import { useState, useEffect } from 'react'
import { useSupabaseNotes } from '@/hooks/useSupabaseNotes'

export function Notes() {
  const { note, updateNote } = useSupabaseNotes()
  const [localContent, setLocalContent] = useState('')

  useEffect(() => {
    setLocalContent(note.content)
  }, [note.content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setLocalContent(value)
    updateNote(value)
  }

  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0

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
