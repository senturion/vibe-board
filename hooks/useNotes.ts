'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Note } from '@/lib/types'
import { Database } from '@/lib/supabase/types'

type NoteRow = Database['public']['Tables']['notes']['Row']

export function useNotes() {
  const [note, setNote] = useState<Note>({
    content: '',
    updatedAt: new Date().getTime(),
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch note from Supabase
  useEffect(() => {
    let isActive = true
    const fetchNote = async () => {
      if (!user) {
        if (isActive) {
          setNote({ content: '', updatedAt: new Date().getTime() })
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error fetching note:', error)
        if (isActive) {
          setLoading(false)
        }
        return
      }

      if (data && isActive) {
        const noteData = data as NoteRow
        setNote({
          content: noteData.content,
          updatedAt: new Date(noteData.updated_at).getTime(),
        })
      }

      if (isActive) {
        setLoading(false)
      }
    }

    fetchNote()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  const updateNote = useCallback((content: string) => {
    if (!user) return

    // Update local state immediately
    setNote({
      content,
      updatedAt: new Date().getTime(),
    })

    // Debounce the database update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .single()

      if (existing) {
        await supabase
          .from('notes')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('notes')
          .insert({ user_id: user.id, content })
      }
    }, 500)
  }, [user, supabase])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    note,
    loading,
    updateNote,
  }
}
