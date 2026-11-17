'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { playBell } from '@/lib/bell'
import {
  FocusSettings,
  FocusSession,
  SessionType,
  DEFAULT_FOCUS_SETTINGS,
} from '@/lib/types'

const STORAGE_KEY = 'vibe-focus-timer'

/** What is needed to pick a running timer back up after a reload. */
interface PersistedTimer {
  isRunning: boolean
  isPaused: boolean
  /** Wall-clock time the session ends, when running and not paused. */
  endsAt: number | null
  /** Seconds left, when paused. */
  remaining: number
  sessionType: SessionType
  sessionsCompleted: number
  sessionId: string | null
  startedAt: number
  linkedTaskId?: string
  linkedGoalId?: string
}

function readPersistedTimer(): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedTimer
    if (!parsed || typeof parsed !== 'object' || !parsed.isRunning) return null
    return parsed
  } catch {
    return null
  }
}

function useFocusTimerState() {
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
  // The timer is driven by the wall clock, not by counting ticks: browsers
  // throttle timers in background tabs, so a tick counter runs slow.
  const endsAtRef = useRef<number | null>(null)
  const timeRemainingRef = useRef(timeRemaining)
  const isRunningRef = useRef(false)
  const completingRef = useRef(false)
  const [restored, setRestored] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch settings and recent sessions
  useEffect(() => {
    let isActive = true
    const fetchData = async () => {
      if (!user) {
        if (isActive) {
          setSettings(DEFAULT_FOCUS_SETTINGS)
          setSessions([])
          setLoading(false)
        }
        return
      }

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('focus_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settingsError) {
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

      if (settingsData && isActive) {
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
        if (!isRunningRef.current) {
          setTimeRemaining(mappedSettings.workDuration * 60)
        }
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

      if (isActive) {
        setSessions(mappedSessions)
        setLoading(false)
      }
    }

    fetchData()
    return () => {
      isActive = false
    }
  }, [user, supabase])

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

  // Start timer
  // sessionType/seconds let the caller start the *next* session right after
  // queuing its state updates, before this callback has been re-created.
  const startSession = useCallback(async (sessionType: SessionType = currentSessionType, seconds: number = timeRemainingRef.current) => {
    if (!user) return

    startTimeRef.current = Date.now()
    endsAtRef.current = Date.now() + seconds * 1000
    completingRef.current = false
    isRunningRef.current = true
    setIsRunning(true)
    setIsPaused(false)

    // Create session in database
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        planned_duration: getDuration(sessionType),
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

  // Public start takes no arguments, so it is safe to pass straight to onClick.
  const start = useCallback(() => startSession(), [startSession])

  // Handle session complete
  const handleSessionComplete = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Play sound if enabled
    if (settings.soundEnabled) {
      playBell(settings.soundVolume)
    }

    // Update session in database
    if (currentSessionId && user) {
      // If the page was closed when the session ran out, it ended at endsAt, not now.
      const endTime = Math.min(Date.now(), endsAtRef.current ?? Date.now())
      const actualDuration = Math.round((endTime - startTimeRef.current) / 60000)

      await supabase
        .from('focus_sessions')
        .update({
          is_completed: true,
          actual_duration: actualDuration,
          ended_at: new Date(endTime).toISOString(),
        })
        .eq('id', currentSessionId)

      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, isCompleted: true, actualDuration, endedAt: endTime }
          : s
      ))
    }

    // Determine next session
    endsAtRef.current = null
    let nextType: SessionType = 'work'
    if (currentSessionType === 'work') {
      const newCompleted = sessionsCompleted + 1
      setSessionsCompleted(newCompleted)
      nextType = newCompleted % settings.sessionsUntilLongBreak === 0 ? 'long_break' : 'short_break'
    }
    const nextSeconds = getDuration(nextType) * 60
    setCurrentSessionType(nextType)
    setTimeRemaining(nextSeconds)

    const autoStart = nextType === 'work' ? settings.autoStartWork : settings.autoStartBreaks
    if (autoStart) {
      startSession(nextType, nextSeconds)
    } else {
      isRunningRef.current = false
      setIsRunning(false)
      setCurrentSessionId(null)
    }
  }, [currentSessionId, currentSessionType, sessionsCompleted, settings, user, supabase, startSession, getDuration])

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])

  // Timer tick: recompute from the wall clock each time, so a throttled or
  // sleeping tab catches up as soon as it runs again.
  useEffect(() => {
    if (!isRunning || isPaused) return

    const tick = () => {
      if (endsAtRef.current === null) return
      const remaining = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining <= 0 && !completingRef.current) {
        completingRef.current = true
        handleSessionComplete()
      }
    }

    tick()
    timerRef.current = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [handleSessionComplete, isRunning, isPaused])

  // Pause timer: freeze the remaining time and drop the deadline.
  const pause = useCallback(() => {
    if (endsAtRef.current !== null) {
      const remaining = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
      timeRemainingRef.current = remaining
      setTimeRemaining(remaining)
    }
    endsAtRef.current = null
    setIsPaused(true)
  }, [])

  // Resume timer: set a new deadline from the frozen remaining time.
  const resume = useCallback(() => {
    endsAtRef.current = Date.now() + timeRemainingRef.current * 1000
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

    endsAtRef.current = null
    isRunningRef.current = false
    setIsRunning(false)
    setIsPaused(false)
    setCurrentSessionId(null)
    setTimeRemaining(getDuration(currentSessionType) * 60)
  }, [currentSessionId, currentSessionType, getDuration, user, supabase])

  // Skip to next session
  const skip = useCallback(async () => {
    // stop() resets the countdown for the current session type once its save
    // finishes, so wait for it before setting up the next session.
    await stop()

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
      const minutes = currentSessionType === 'work'
        ? updatedSettings.workDuration
        : currentSessionType === 'short_break'
          ? updatedSettings.shortBreakDuration
          : updatedSettings.longBreakDuration
      setTimeRemaining(minutes * 60)
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
  }, [user, supabase, settings, isRunning, currentSessionType])

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

  // Pick a running timer back up after a reload.
  useEffect(() => {
    const saved = readPersistedTimer()
    if (saved) {
      startTimeRef.current = saved.startedAt
      endsAtRef.current = saved.isPaused ? null : saved.endsAt
      timeRemainingRef.current = saved.remaining
      isRunningRef.current = true
      // Restoring from storage after mount is the one place state has to be
      // set from an effect: localStorage does not exist during prerender.
      /* eslint-disable react-hooks/set-state-in-effect */
      setCurrentSessionType(saved.sessionType)
      setSessionsCompleted(saved.sessionsCompleted)
      setCurrentSessionId(saved.sessionId)
      setLinkedTaskId(saved.linkedTaskId)
      setLinkedGoalId(saved.linkedGoalId)
      setTimeRemaining(saved.remaining)
      setIsPaused(saved.isPaused)
      setIsRunning(true)
    }
    setRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Save the timer whenever it changes, so a reload can restore it.
  useEffect(() => {
    if (!restored) return
    try {
      if (!isRunning) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      const snapshot: PersistedTimer = {
        isRunning,
        isPaused,
        endsAt: endsAtRef.current,
        remaining: timeRemainingRef.current,
        sessionType: currentSessionType,
        sessionsCompleted,
        sessionId: currentSessionId,
        startedAt: startTimeRef.current,
        linkedTaskId,
        linkedGoalId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Storage can be unavailable (private mode); the timer still works without it.
    }
  }, [restored, isRunning, isPaused, currentSessionType, sessionsCompleted, currentSessionId, linkedTaskId, linkedGoalId])

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

type FocusTimer = ReturnType<typeof useFocusTimerState>

const FocusTimerContext = createContext<FocusTimer | null>(null)

/** Holds the one focus timer for the app, so every view shows the same countdown. */
export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const timer = useFocusTimerState()
  return createElement(FocusTimerContext.Provider, { value: timer }, children)
}

export function useFocusTimer(): FocusTimer {
  const timer = useContext(FocusTimerContext)
  if (!timer) throw new Error('useFocusTimer must be used within a FocusTimerProvider')
  return timer
}
