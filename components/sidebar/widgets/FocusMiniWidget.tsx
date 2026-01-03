'use client'

import { Timer, Play, Pause, RotateCcw } from 'lucide-react'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

export function FocusMiniWidget() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentSessionType,
    sessionsCompleted,
    start,
    pause,
    resume,
    reset,
    settings,
  } = useFocusTimer()

  const { setActiveView } = useNavigation()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = currentSessionType === 'work'
    ? 1 - (timeRemaining / (settings.workDuration * 60))
    : currentSessionType === 'short_break'
    ? 1 - (timeRemaining / (settings.shortBreakDuration * 60))
    : 1 - (timeRemaining / (settings.longBreakDuration * 60))

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setActiveView('focus')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Timer size={14} className={cn(
            currentSessionType === 'work' ? 'text-[var(--accent)]' : 'text-[var(--success)]'
          )} />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            Focus
          </span>
        </button>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {currentSessionType === 'work' ? 'Work' : 'Break'}
        </span>
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'text-2xl font-display tracking-tight',
            isRunning && !isPaused && 'animate-pulse',
            currentSessionType === 'work' ? 'text-[var(--accent)]' : 'text-[var(--success)]'
          )}
        >
          {formatTime(timeRemaining)}
        </div>

        <div className="flex items-center gap-1">
          {!isRunning ? (
            <button
              onClick={start}
              className="p-1.5 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] transition-colors"
              title="Start"
            >
              <Play size={12} />
            </button>
          ) : (
            <button
              onClick={isPaused ? resume : pause}
              className="p-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          )}
          {(isRunning || sessionsCompleted > 0) && (
            <button
              onClick={reset}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] transition-colors"
              title="Reset"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            currentSessionType === 'work' ? 'bg-[var(--accent)]' : 'bg-[var(--success)]'
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Session count */}
      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
        {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} today
      </p>
    </div>
  )
}
