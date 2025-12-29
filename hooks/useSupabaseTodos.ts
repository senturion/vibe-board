'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TodoItem } from '@/lib/types'

interface DbTodo {
  id: string
  user_id: string
  text: string
  completed: boolean
  created_at: string
}

export function useSupabaseTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const mappedTodos: TodoItem[] = (data as DbTodo[]).map(t => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          createdAt: new Date(t.created_at).getTime(),
        }))
        setTodos(mappedTodos)
      }
      setLoading(false)
    }

    fetchTodos()
  }, [user, supabase])

  const addTodo = useCallback(async (text: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, text })
      .select()
      .single()

    if (!error && data) {
      const newTodo: TodoItem = {
        id: data.id,
        text: data.text,
        completed: data.completed,
        createdAt: new Date(data.created_at).getTime(),
      }
      setTodos(prev => [newTodo, ...prev])
    }
  }, [user, supabase])

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ))
    }
  }, [todos, supabase])

  const deleteTodo = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) {
      setTodos(prev => prev.filter(t => t.id !== id))
    }
  }, [supabase])

  const updateTodo = useCallback(async (id: string, text: string) => {
    const { error } = await supabase
      .from('todos')
      .update({ text })
      .eq('id', id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === id ? { ...t, text } : t
      ))
    }
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
