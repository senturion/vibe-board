'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeId, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, getTheme, migrateLegacyTheme } from '@/lib/themes'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_DARK_THEME)
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    const initTheme = async () => {
      // Check localStorage first for immediate display
      const stored = localStorage.getItem('theme')
      if (stored) {
        const migrated = migrateLegacyTheme(stored)
        // Persist migration if value changed
        if (migrated !== stored) {
          localStorage.setItem('theme', migrated)
        }
        setThemeState(migrated)
        document.documentElement.setAttribute('data-theme', migrated)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const defaultTheme = prefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME
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
          const serverTheme = migrateLegacyTheme(data.theme)
          setThemeState(serverTheme)
          localStorage.setItem('theme', serverTheme)
          document.documentElement.setAttribute('data-theme', serverTheme)
        }
      }
    }

    initTheme()
  }, [user, supabase])

  const setTheme = useCallback(async (newTheme: ThemeId) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)

    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, theme: newTheme })
    }
  }, [user, supabase])

  const themeDefinition = getTheme(theme)

  return {
    theme,
    setTheme,
    isDark: themeDefinition?.type === 'dark',
    isLight: themeDefinition?.type === 'light',
    mounted,
  }
}
