'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Star, Sparkles, Calendar } from 'lucide-react'
import { useJournal } from '@/hooks/useJournal'
import { JournalEntry, MOOD_EMOJIS, formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/ui/EmptyState'
import { MoodBadge } from '@/components/ui/Badge'
import { MoodPicker } from './MoodPicker'

export function JournalPage() {
  const {
    entries,
    loading,
    getEntry,
    saveEntry,
    toggleFavorite,
    getRandomPrompt,
    getWritingStats,
    getMoodTrend,
  } = useJournal()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<number | undefined>()
  const [moodEmoji, setMoodEmoji] = useState<string | undefined>()
  const [showPrompt, setShowPrompt] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')

  const dateKey = formatDateKey(selectedDate)
  const isToday = dateKey === formatDateKey(new Date())

  const stats = useMemo(() => getWritingStats(), [getWritingStats])

  // Load entry when date changes
  useEffect(() => {
    const entry = getEntry(selectedDate)
    if (entry) {
      setContent(entry.content)
      setMood(entry.mood)
      setMoodEmoji(entry.moodEmoji)
    } else {
      setContent('')
      setMood(undefined)
      setMoodEmoji(undefined)
    }
  }, [selectedDate, getEntry])

  // Auto-save when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim() || mood) {
        saveEntry(selectedDate, content, mood, moodEmoji)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, mood, moodEmoji, selectedDate, saveEntry])

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    if (newDate <= new Date()) {
      setSelectedDate(newDate)
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const handlePrompt = () => {
    const prompt = getRandomPrompt()
    setCurrentPrompt(prompt)
    setShowPrompt(true)
  }

  const handleMoodChange = (value: number) => {
    const moodData = MOOD_EMOJIS.find(m => m.value === value)
    setMood(value)
    setMoodEmoji(moodData?.emoji)
  }

  const currentEntry = getEntry(selectedDate)

  if (loading) {
    return <LoadingState message="Loading journal..." />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Journal</h1>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={goToToday}
            className={cn(
              'px-4 py-2 text-[12px] border transition-colors',
              isToday
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
            )}
          >
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </button>

          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--text-primary)]">{stats.totalEntries}</p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Entries
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--accent)]">{stats.streak}</p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Day Streak
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--text-primary)]">
                  {stats.totalWords.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Words Written
                </p>
              </div>
            </Card>
          </div>

          {/* Journal Entry */}
          <Card variant="bordered" padding="none">
            {/* Entry header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-[var(--text-primary)]">
                  {isToday ? "Today's Entry" : selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                {currentEntry?.isFavorite && (
                  <Star size={14} className="text-[var(--accent)] fill-[var(--accent)]" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mood selector */}
                <MoodPicker value={mood} onChange={handleMoodChange} />

                {/* Favorite toggle */}
                {currentEntry && (
                  <button
                    onClick={() => toggleFavorite(currentEntry.id)}
                    className={cn(
                      'p-2 border transition-colors',
                      currentEntry.isFavorite
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    <Star size={14} className={currentEntry.isFavorite ? 'fill-current' : ''} />
                  </button>
                )}

                {/* Prompt button */}
                <button
                  onClick={handlePrompt}
                  className="p-2 border border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  title="Get a writing prompt"
                >
                  <Sparkles size={14} />
                </button>
              </div>
            </div>

            {/* Prompt display */}
            {showPrompt && (
              <div className="px-4 py-3 bg-[var(--accent-glow)] border-b border-[var(--accent-muted)]">
                <p className="text-[13px] text-[var(--accent)] italic">{currentPrompt}</p>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="text-[10px] text-[var(--accent-muted)] hover:text-[var(--accent)] mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Mood display */}
            {mood && (
              <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Mood:</span>
                <MoodBadge mood={mood as 1 | 2 | 3 | 4 | 5} showLabel size="sm" />
              </div>
            )}

            {/* Text area */}
            <div className="p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isToday
                  ? "What's on your mind today?"
                  : "Write about this day..."
                }
                className="w-full min-h-[300px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none text-[14px] leading-relaxed"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
              <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Auto-saved</span>
            </div>
          </Card>

          {/* Recent Entries */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>
                <Calendar size={14} className="mr-2 inline" />
                Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] text-center py-4">
                  No entries yet. Start writing today!
                </p>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 7).map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedDate(new Date(entry.entryDate + 'T00:00:00'))}
                      className={cn(
                        'w-full flex items-center justify-between p-3 text-left border transition-colors',
                        entry.entryDate === dateKey
                          ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                          : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {entry.mood && <MoodBadge mood={entry.mood as 1 | 2 | 3 | 4 | 5} size="sm" />}
                        <div>
                          <p className="text-[12px] font-medium text-[var(--text-primary)]">
                            {new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[200px]">
                            {entry.content.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.isFavorite && (
                          <Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" />
                        )}
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {entry.wordCount} words
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
