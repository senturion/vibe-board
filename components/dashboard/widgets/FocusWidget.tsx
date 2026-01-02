'use client'

import { Timer, Play, Pause } from 'lucide-react'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

export function FocusWidget() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentSessionType,
    start,
    pause,
    resume,
  } = useFocusTimer()

  const { setActiveView } = useNavigation()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div
        className={cn(
          'text-3xl font-display tracking-tight',
          currentSessionType === 'work' ? 'text-[var(--accent)]' : 'text-[var(--success)]'
        )}
      >
        {formatTime(timeRemaining)}
      </div>

      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            onClick={start}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] uppercase tracking-[0.1em] hover:bg-[var(--accent-muted)]"
          >
            <Play size={12} />
            Start
          </button>
        ) : (
          <button
            onClick={isPaused ? resume : pause}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] uppercase tracking-[0.1em] border border-[var(--border)]"
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}

        <button
          onClick={() => setActiveView('focus')}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)]"
          title="Open Focus Timer"
        >
          <Timer size={12} />
        </button>
      </div>

      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.1em]">
        {currentSessionType === 'work' ? 'Focus Session' : currentSessionType === 'short_break' ? 'Short Break' : 'Long Break'}
      </p>
    </div>
  )
}
