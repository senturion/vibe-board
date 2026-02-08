'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Loader2, Send, SkipForward, AlertCircle, RotateCcw } from 'lucide-react'
import { KanbanTask } from '@/lib/types'

interface Clarification {
  question: string
  answer: string
}

type Phase = 'loading-questions' | 'answering' | 'generating'

interface ClarifyDrawerProps {
  isOpen: boolean
  onClose: () => void
  task: KanbanTask
  onSubtasksGenerated: (subtasks: { id: string; text: string; completed: boolean }[]) => void
}

export function ClarifyDrawer({ isOpen, onClose, task, onSubtasksGenerated }: ClarifyDrawerProps) {
  const [phase, setPhase] = useState<Phase>('loading-questions')
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [clarifications, setClarifications] = useState<Clarification[]>([])
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch questions on open
  const fetchQuestions = useCallback(async () => {
    setPhase('loading-questions')
    setError(null)
    try {
      const res = await fetch('/api/tasks/clarify-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
        }),
      })
      if (!res.ok) throw new Error('Failed to load questions')
      const data = await res.json()
      const q: string[] = data.questions || []
      if (q.length === 0) {
        // No questions needed — skip to generation
        generateSubtasks([])
      } else {
        setQuestions(q)
        setCurrentIdx(0)
        setClarifications([])
        setPhase('answering')
      }
    } catch {
      setError('Could not load clarifying questions.')
      setPhase('loading-questions')
    }
  }, [task.title, task.description, task.priority])

  const generateSubtasks = useCallback(async (finalClarifications: Clarification[]) => {
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch('/api/tasks/generate-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          existingSubtasks: (task.subtasks || []).map(s => s.text),
          priority: task.priority,
          clarifications: finalClarifications.length > 0 ? finalClarifications : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate subtasks')
      const data = await res.json()
      const generated: string[] = data.subtasks || []
      if (generated.length > 0) {
        const subtasks = generated.map(text => ({
          id: crypto.randomUUID(),
          text,
          completed: false,
        }))
        onSubtasksGenerated(subtasks)
      }
      onClose()
    } catch {
      setError('Could not generate subtasks.')
    }
  }, [task.title, task.description, task.subtasks, task.priority, onSubtasksGenerated, onClose])

  useEffect(() => {
    if (isOpen) {
      setQuestions([])
      setCurrentIdx(0)
      setClarifications([])
      setAnswer('')
      setError(null)
      fetchQuestions()
    }
  }, [isOpen, fetchQuestions])

  // Focus input when entering answering phase
  useEffect(() => {
    if (phase === 'answering') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, currentIdx])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [clarifications, phase, currentIdx])

  // Escape key — close drawer without closing modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  const handleSubmitAnswer = () => {
    const trimmed = answer.trim()
    if (!trimmed) return
    advanceQuestion(trimmed)
  }

  const handleSkip = () => {
    advanceQuestion('(skipped)')
  }

  const advanceQuestion = (answerText: string) => {
    const newClarification: Clarification = {
      question: questions[currentIdx],
      answer: answerText,
    }
    const updated = [...clarifications, newClarification]
    setClarifications(updated)
    setAnswer('')

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      // All questions answered
      const withAnswers = updated.filter(c => c.answer !== '(skipped)')
      generateSubtasks(withAnswers)
    }
  }

  const handleRetry = () => {
    if (phase === 'loading-questions') {
      fetchQuestions()
    } else if (phase === 'generating') {
      const withAnswers = clarifications.filter(c => c.answer !== '(skipped)')
      generateSubtasks(withAnswers)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Clarify task"
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl shadow-black/30 z-[60] flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} className="text-[var(--text-tertiary)]" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-0.5">
                Clarify
              </p>
              <span className="font-display text-lg text-[var(--text-primary)] italic">
                Task Details
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close clarify drawer"
            className="p-2 -m-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Task context */}
          <div className="px-3 py-2 bg-[var(--bg-tertiary)] border-l-2 border-[var(--accent)]">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-1">Task</p>
            <p className="text-[13px] text-[var(--text-primary)]">{task.title}</p>
            {task.description && (
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">{task.description}</p>
            )}
          </div>

          {/* Q&A history */}
          {clarifications.map((c, i) => (
            <div key={i} className="space-y-2">
              {/* AI question */}
              <div className="flex gap-2">
                <div className="w-5 h-5 shrink-0 flex items-center justify-center bg-[var(--accent-glow)] text-[var(--accent)]">
                  <MessageCircle size={10} />
                </div>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed pt-0.5">{c.question}</p>
              </div>
              {/* User answer */}
              <div className="flex gap-2 justify-end">
                <p className={`text-[13px] leading-relaxed px-3 py-1.5 bg-[var(--bg-tertiary)] ${c.answer === '(skipped)' ? 'text-[var(--text-tertiary)] italic' : 'text-[var(--text-primary)]'}`}>
                  {c.answer === '(skipped)' ? 'Skipped' : c.answer}
                </p>
              </div>
            </div>
          ))}

          {/* Current question */}
          {phase === 'answering' && currentIdx < questions.length && (
            <div className="flex gap-2">
              <div className="w-5 h-5 shrink-0 flex items-center justify-center bg-[var(--accent-glow)] text-[var(--accent)]">
                <MessageCircle size={10} />
              </div>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed pt-0.5">{questions[currentIdx]}</p>
            </div>
          )}

          {/* Loading states */}
          {phase === 'loading-questions' && !error && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <p className="text-[12px] text-[var(--text-tertiary)] italic">Analyzing your task...</p>
            </div>
          )}

          {phase === 'generating' && !error && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <p className="text-[12px] text-[var(--text-tertiary)] italic">Generating subtasks...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 py-3 px-3 bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-[12px] text-red-400 flex-1">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw size={12} />
                Retry
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        {phase === 'answering' && (
          <div className="p-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitAnswer()
                }}
                placeholder="Type your answer..."
                className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--text-tertiary)] transition-colors"
              />
              <button
                onClick={handleSkip}
                title="Skip this question"
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <SkipForward size={16} />
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={!answer.trim()}
                title="Submit answer"
                className="p-2 text-[var(--accent)] hover:text-[var(--accent-muted)] disabled:opacity-40 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
