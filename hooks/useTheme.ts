'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    const initTheme = async () => {
      // First check localStorage for immediate display
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored) {
        setThemeState(stored)
        document.documentElement.setAttribute('data-theme', stored)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const defaultTheme = prefersDark ? 'dark' : 'light'
        setThemeState(defaultTheme)
        document.documentElement.setAttribute('data-theme', defaultTheme)
      }

      // If logged in, fetch from Supabase and sync
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .single()

        if (data?.theme) {
          const serverTheme = data.theme as Theme
          setThemeState(serverTheme)
          localStorage.setItem('theme', serverTheme)
          document.documentElement.setAttribute('data-theme', serverTheme)
        }
      }
    }

    initTheme()
  }, [user, supabase])

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)

    // Sync to Supabase if logged in
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, theme: newTheme })
    }
  }, [user, supabase])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted,
  }
}
