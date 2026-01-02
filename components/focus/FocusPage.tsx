'use client'

import { useState, useMemo } from 'react'
import { Timer as TimerIcon, Play, Pause, Square, SkipForward, RotateCcw, Settings, Coffee, Brain } from 'lucide-react'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { SessionType, SESSION_TYPES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ProgressSteps } from '@/components/ui/Progress'
import { LoadingState } from '@/components/ui/EmptyState'
import { FocusSettings } from './FocusSettings'

export function FocusPage() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentSessionType,
    sessionsCompleted,
    start,
    pause,
    resume,
    stop,
    skip,
    reset,
    settings,
    updateSettings,
    loading,
    getTodaysFocusTime,
    getWeeklyFocusTime,
    sessions,
  } = useFocusTimer()

  const [showSettings, setShowSettings] = useState(false)

  const todaysFocusTime = useMemo(() => getTodaysFocusTime(), [getTodaysFocusTime])
  const weeklyFocusTime = useMemo(() => getWeeklyFocusTime(), [getWeeklyFocusTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const sessionInfo = SESSION_TYPES.find(s => s.id === currentSessionType)
  const progress = 1 - (timeRemaining / (settings.workDuration * 60))

  const todaysSessions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sessions.filter(s => s.startedAt >= today.getTime() && s.sessionType === 'work' && s.isCompleted)
  }, [sessions])

  if (loading) {
    return <LoadingState message="Loading focus timer..." />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <TimerIcon size={20} className="text-[var(--accent)]" />
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Focus Timer</h1>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Timer Display */}
          <div className="text-center">
            {/* Session type indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {currentSessionType === 'work' ? (
                <Brain size={24} className="text-[var(--accent)]" />
              ) : (
                <Coffee size={24} className="text-[var(--success)]" />
              )}
              <span className="text-[12px] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                {sessionInfo?.label}
              </span>
            </div>

            {/* Timer circle */}
            <div
              className={cn(
                'relative inline-flex items-center justify-center w-64 h-64 rounded-full border-4 transition-colors',
                isRunning && !isPaused && 'animate-timer-pulse',
                currentSessionType === 'work'
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--success)]'
              )}
              style={{
                background: `conic-gradient(
                  ${currentSessionType === 'work' ? 'var(--accent)' : 'var(--success)'} ${progress * 360}deg,
                  var(--bg-tertiary) ${progress * 360}deg
                )`,
              }}
            >
              <div className="absolute inset-2 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                <span className="font-display text-6xl text-[var(--text-primary)] tracking-tight">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>

            {/* Session progress */}
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
                Sessions until long break
              </p>
              <ProgressSteps
                current={sessionsCompleted % settings.sessionsUntilLongBreak}
                total={settings.sessionsUntilLongBreak}
                size="md"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-8">
              {!isRunning ? (
                <button
                  onClick={start}
                  className="flex items-center gap-2 px-8 py-3 bg-[var(--accent)] text-[var(--bg-primary)] text-[12px] uppercase tracking-[0.15em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
                >
                  <Play size={18} />
                  Start
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={resume}
                      className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] text-[12px] uppercase tracking-[0.15em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
                    >
                      <Play size={18} />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={pause}
                      className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] text-[12px] uppercase tracking-[0.15em] font-medium hover:border-[var(--text-tertiary)] transition-colors"
                    >
                      <Pause size={18} />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={stop}
                    className="p-3 text-[var(--text-tertiary)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/50 transition-colors"
                    title="Stop"
                  >
                    <Square size={18} />
                  </button>
                  <button
                    onClick={skip}
                    className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                    title="Skip to next"
                  >
                    <SkipForward size={18} />
                  </button>
                </>
              )}

              {(sessionsCompleted > 0 || isRunning) && (
                <button
                  onClick={reset}
                  className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-2xl font-medium text-[var(--text-primary)]">
                  {formatDuration(todaysFocusTime)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Today
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-2xl font-medium text-[var(--accent)]">
                  {todaysSessions.length}
                </p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Sessions Today
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-2xl font-medium text-[var(--text-primary)]">
                  {formatDuration(weeklyFocusTime)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  This Week
                </p>
              </div>
            </Card>
          </div>

          {/* Recent Sessions */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>Today&apos;s Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {todaysSessions.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center py-4">
                  No completed sessions today. Start focusing!
                </p>
              ) : (
                <div className="space-y-2">
                  {todaysSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] border border-[var(--border)]"
                    >
                      <div className="flex items-center gap-3">
                        <Brain size={14} className="text-[var(--accent)]" />
                        <span className="text-[12px] text-[var(--text-secondary)]">
                          {new Date(session.startedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {session.actualDuration || session.plannedDuration}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <FocusSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={updateSettings}
      />
    </div>
  )
}
