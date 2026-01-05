'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TodoItem } from '@/lib/types'
import { Database } from '@/lib/supabase/types'

type TodoRow = Database['public']['Tables']['todos']['Row']

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch todos from Supabase
  useEffect(() => {
    let isActive = true
    const fetchTodos = async () => {
      if (!user) {
        if (isActive) {
          setTodos([])
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching todos:', error)
        if (isActive) {
          setLoading(false)
        }
        return
      }

      const mappedTodos: TodoItem[] = (data as TodoRow[]).map(t => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        createdAt: new Date(t.created_at).getTime(),
      }))

      if (isActive) {
        setTodos(mappedTodos)
        setLoading(false)
      }
    }

    fetchTodos()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  const addTodo = useCallback(async (text: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, text, completed: false })
      .select()
      .single()

    if (error) {
      console.error('Error creating todo:', error)
      return
    }

    const newTodo: TodoItem = {
      id: data.id,
      text: data.text,
      completed: data.completed,
      createdAt: new Date(data.created_at).getTime(),
    }

    setTodos(prev => [newTodo, ...prev])
  }, [user, supabase])

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', id)

    if (error) {
      console.error('Error toggling todo:', error)
      return
    }

    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }, [todos, supabase])

  const deleteTodo = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting todo:', error)
      return
    }

    setTodos(prev => prev.filter(t => t.id !== id))
  }, [supabase])

  const updateTodo = useCallback(async (id: string, text: string) => {
    const { error } = await supabase
      .from('todos')
      .update({ text })
      .eq('id', id)

    if (error) {
      console.error('Error updating todo:', error)
      return
    }

    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, text } : t
    ))
  }, [supabase])

  return {
    todos,
    loading,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
  }
}
