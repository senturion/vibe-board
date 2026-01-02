'use client'

import { useState } from 'react'
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { useJournal } from '@/hooks/useJournal'
import { useNavigation } from '@/contexts/NavigationContext'
import { formatDateKey } from '@/lib/types'

export function JournalWidget() {
  const { todaysEntry, saveEntry, getRandomPrompt, loading } = useJournal()
  const { setActiveView } = useNavigation()
  const [showPrompt, setShowPrompt] = useState(false)
  const [prompt, setPrompt] = useState<string | null>(null)

  const todayKey = formatDateKey(new Date())

  const handleGetPrompt = () => {
    const randomPrompt = getRandomPrompt()
    if (randomPrompt) {
      setPrompt(randomPrompt.promptText)
      setShowPrompt(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  const hasEntry = todaysEntry && todaysEntry.content.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--accent)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">
            {hasEntry ? `${todaysEntry?.wordCount || 0} words` : 'No entry yet'}
          </span>
        </div>
        <button
          onClick={() => setActiveView('journal')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {showPrompt && prompt ? (
          <div className="mb-2 p-2 bg-[var(--accent-glow)] border border-[var(--accent-muted)] rounded">
            <p className="text-[10px] text-[var(--accent)] italic">&ldquo;{prompt}&rdquo;</p>
          </div>
        ) : (
          <button
            onClick={handleGetPrompt}
            className="mb-2 flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent)]"
          >
            <Sparkles size={10} />
            Get a prompt
          </button>
        )}

        <textarea
          value={todaysEntry?.content || ''}
          onChange={(e) => saveEntry(todayKey, e.target.value)}
          placeholder="Write something..."
          className="flex-1 w-full bg-transparent text-[11px] text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] resize-none outline-none"
        />
      </div>
    </div>
  )
}
