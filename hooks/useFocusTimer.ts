'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  FocusSettings,
  FocusSession,
  SessionType,
  DEFAULT_FOCUS_SETTINGS,
} from '@/lib/types'

export function useFocusTimer() {
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_FOCUS_SETTINGS)
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_FOCUS_SETTINGS.workDuration * 60)
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>()
  const [linkedGoalId, setLinkedGoalId] = useState<string | undefined>()

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch settings and recent sessions
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_FOCUS_SETTINGS)
      setSessions([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('focus_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError)
      }

      // Fetch recent sessions (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
      }

      if (settingsData) {
        const mappedSettings: FocusSettings = {
          workDuration: settingsData.work_duration,
          shortBreakDuration: settingsData.short_break_duration,
          longBreakDuration: settingsData.long_break_duration,
          sessionsUntilLongBreak: settingsData.sessions_until_long_break,
          autoStartBreaks: settingsData.auto_start_breaks,
          autoStartWork: settingsData.auto_start_work,
          soundEnabled: settingsData.sound_enabled,
          soundVolume: settingsData.sound_volume,
        }
        setSettings(mappedSettings)
        setTimeRemaining(mappedSettings.workDuration * 60)
      }

      const mappedSessions: FocusSession[] = (sessionsData || []).map(s => ({
        id: s.id,
        sessionType: s.session_type as SessionType,
        plannedDuration: s.planned_duration,
        actualDuration: s.actual_duration || undefined,
        isCompleted: s.is_completed,
        taskId: s.task_id || undefined,
        goalId: s.goal_id || undefined,
        note: s.note || undefined,
        startedAt: new Date(s.started_at).getTime(),
        endedAt: s.ended_at ? new Date(s.ended_at).getTime() : undefined,
      }))

      setSessions(mappedSessions)
      setLoading(false)
    }

    fetchData()
  }, [user, supabase])

  // Timer tick
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, isPaused])

  // Get duration for session type
  const getDuration = useCallback((type: SessionType) => {
    switch (type) {
      case 'work':
        return settings.workDuration
      case 'short_break':
        return settings.shortBreakDuration
      case 'long_break':
        return settings.longBreakDuration
    }
  }, [settings])

  // Handle session complete
  const handleSessionComplete = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Play sound if enabled
    if (settings.soundEnabled) {
      try {
        const audio = new Audio('/sounds/bell.mp3')
        audio.volume = settings.soundVolume / 100
        audio.play().catch(() => {})
      } catch {
        // Ignore audio errors
      }
    }

    // Update session in database
    if (currentSessionId && user) {
      const endTime = Date.now()
      const actualDuration = Math.round((endTime - startTimeRef.current) / 60000)

      await supabase
        .from('focus_sessions')
        .update({
          is_completed: true,
          actual_duration: actualDuration,
          ended_at: new Date().toISOString(),
        })
        .eq('id', currentSessionId)

      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, isCompleted: true, actualDuration, endedAt: endTime }
          : s
      ))
    }

    // Determine next session
    if (currentSessionType === 'work') {
      const newCompleted = sessionsCompleted + 1
      setSessionsCompleted(newCompleted)

      if (newCompleted % settings.sessionsUntilLongBreak === 0) {
        setCurrentSessionType('long_break')
        setTimeRemaining(settings.longBreakDuration * 60)
      } else {
        setCurrentSessionType('short_break')
        setTimeRemaining(settings.shortBreakDuration * 60)
      }

      if (settings.autoStartBreaks) {
        start()
      } else {
        setIsRunning(false)
        setCurrentSessionId(null)
      }
    } else {
      setCurrentSessionType('work')
      setTimeRemaining(settings.workDuration * 60)

      if (settings.autoStartWork) {
        start()
      } else {
        setIsRunning(false)
        setCurrentSessionId(null)
      }
    }
  }, [currentSessionId, currentSessionType, sessionsCompleted, settings, user, supabase])

  // Start timer
  const start = useCallback(async () => {
    if (!user) return

    startTimeRef.current = Date.now()
    setIsRunning(true)
    setIsPaused(false)

    // Create session in database
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        session_type: currentSessionType,
        planned_duration: getDuration(currentSessionType),
        task_id: linkedTaskId || null,
        goal_id: linkedGoalId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
    } else if (data) {
      setCurrentSessionId(data.id)

      const newSession: FocusSession = {
        id: data.id,
        sessionType: data.session_type as SessionType,
        plannedDuration: data.planned_duration,
        isCompleted: false,
        taskId: data.task_id || undefined,
        goalId: data.goal_id || undefined,
        startedAt: new Date(data.started_at).getTime(),
      }

      setSessions(prev => [newSession, ...prev])
    }
  }, [user, supabase, currentSessionType, getDuration, linkedTaskId, linkedGoalId])

  // Pause timer
  const pause = useCallback(() => {
    setIsPaused(true)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [])

  // Resume timer
  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  // Stop timer
  const stop = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Update session as incomplete
    if (currentSessionId && user) {
      const endTime = Date.now()
      const actualDuration = Math.round((endTime - startTimeRef.current) / 60000)

      await supabase
        .from('focus_sessions')
        .update({
          is_completed: false,
          actual_duration: actualDuration,
          ended_at: new Date().toISOString(),
        })
        .eq('id', currentSessionId)

      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, isCompleted: false, actualDuration, endedAt: endTime }
          : s
      ))
    }

    setIsRunning(false)
    setIsPaused(false)
    setCurrentSessionId(null)
    setTimeRemaining(getDuration(currentSessionType) * 60)
  }, [currentSessionId, currentSessionType, getDuration, user, supabase])

  // Skip to next session
  const skip = useCallback(() => {
    stop()

    if (currentSessionType === 'work') {
      const newCompleted = sessionsCompleted + 1
      setSessionsCompleted(newCompleted)

      if (newCompleted % settings.sessionsUntilLongBreak === 0) {
        setCurrentSessionType('long_break')
        setTimeRemaining(settings.longBreakDuration * 60)
      } else {
        setCurrentSessionType('short_break')
        setTimeRemaining(settings.shortBreakDuration * 60)
      }
    } else {
      setCurrentSessionType('work')
      setTimeRemaining(settings.workDuration * 60)
    }
  }, [currentSessionType, sessionsCompleted, settings, stop])

  // Reset timer
  const reset = useCallback(() => {
    stop()
    setSessionsCompleted(0)
    setCurrentSessionType('work')
    setTimeRemaining(settings.workDuration * 60)
    setLinkedTaskId(undefined)
    setLinkedGoalId(undefined)
  }, [settings.workDuration, stop])

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<FocusSettings>) => {
    if (!user) return

    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    // Update time remaining if not running
    if (!isRunning) {
      setTimeRemaining(getDuration(currentSessionType) * 60)
    }

    await supabase
      .from('focus_settings')
      .upsert({
        user_id: user.id,
        work_duration: updatedSettings.workDuration,
        short_break_duration: updatedSettings.shortBreakDuration,
        long_break_duration: updatedSettings.longBreakDuration,
        sessions_until_long_break: updatedSettings.sessionsUntilLongBreak,
        auto_start_breaks: updatedSettings.autoStartBreaks,
        auto_start_work: updatedSettings.autoStartWork,
        sound_enabled: updatedSettings.soundEnabled,
        sound_volume: updatedSettings.soundVolume,
      })
  }, [user, supabase, settings, isRunning, currentSessionType, getDuration])

  // Link to task
  const linkToTask = useCallback((taskId: string) => {
    setLinkedTaskId(taskId)
  }, [])

  // Link to goal
  const linkToGoal = useCallback((goalId: string) => {
    setLinkedGoalId(goalId)
  }, [])

  // Clear links
  const clearLinks = useCallback(() => {
    setLinkedTaskId(undefined)
    setLinkedGoalId(undefined)
  }, [])

  // Get today's focus time
  const getTodaysFocusTime = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return sessions
      .filter(s => s.startedAt >= today.getTime() && s.sessionType === 'work' && s.isCompleted)
      .reduce((sum, s) => sum + (s.actualDuration || s.plannedDuration), 0)
  }, [sessions])

  // Get weekly focus time
  const getWeeklyFocusTime = useCallback(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    return sessions
      .filter(s => s.startedAt >= weekAgo.getTime() && s.sessionType === 'work' && s.isCompleted)
      .reduce((sum, s) => sum + (s.actualDuration || s.plannedDuration), 0)
  }, [sessions])

  // Get sessions by task
  const getSessionsByTask = useCallback((taskId: string) => {
    return sessions.filter(s => s.taskId === taskId)
  }, [sessions])

  return {
    // Timer state
    isRunning,
    isPaused,
    timeRemaining,
    currentSessionType,
    sessionsCompleted,

    // Controls
    start,
    pause,
    resume,
    stop,
    skip,
    reset,

    // Settings
    settings,
    updateSettings,
    loading,

    // Linking
    linkedTaskId,
    linkedGoalId,
    linkToTask,
    linkToGoal,
    clearLinks,

    // Stats
    sessions,
    getTodaysFocusTime,
    getWeeklyFocusTime,
    getSessionsByTask,
  }
}
