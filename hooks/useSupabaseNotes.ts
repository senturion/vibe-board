'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Note } from '@/lib/types'

interface DbNote {
  id: string
  user_id: string
  content: string
  updated_at: string
}

export function useSupabaseNotes() {
  const [note, setNote] = useState<Note>({ content: '', updatedAt: Date.now() })
  const [loading, setLoading] = useState(true)
  const [noteId, setNoteId] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchNote = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .single()

      if (!error && data) {
        const dbNote = data as DbNote
        setNote({
          content: dbNote.content,
          updatedAt: new Date(dbNote.updated_at).getTime(),
        })
        setNoteId(dbNote.id)
      } else {
        // Create a note if none exists
        const { data: newNote } = await supabase
          .from('notes')
          .insert({ user_id: user.id, content: '' })
          .select()
          .single()

        if (newNote) {
          setNoteId(newNote.id)
        }
      }
      setLoading(false)
    }

    fetchNote()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [user, supabase])

  const updateNote = useCallback((content: string) => {
    // Update local state immediately
    setNote({
      content,
      updatedAt: Date.now(),
    })

    // Debounce the database update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      if (noteId) {
        await supabase
          .from('notes')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId)
      }
    }, 500)
  }, [noteId, supabase])

  return {
    note,
    loading,
    updateNote,
  }
}
