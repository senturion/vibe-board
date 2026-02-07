'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal, ModalActions } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import {
  Board,
  COLUMNS,
  Goal,
  GoalTaskPlanOptions,
  GoalTaskSuggestion,
  Milestone,
  PRIORITIES,
  Priority,
} from '@/lib/types'

interface GoalTaskPlannerModalProps {
  isOpen: boolean
  goal?: Goal
  milestones: Milestone[]
  boards: Board[]
  defaultBoardId: string
  onClose: () => void
  onGenerate: (goalId: string, options: GoalTaskPlanOptions) => Promise<GoalTaskSuggestion[]>
  onCreate: (
    goalId: string,
    suggestions: GoalTaskSuggestion[],
    options: GoalTaskPlanOptions
  ) => Promise<{ created: number; skipped: number }>
}

const DEFAULT_OPTIONS: Omit<GoalTaskPlanOptions, 'boardId'> = {
  column: 'todo',
  horizonDays: 14,
  maxTasks: 6,
}

export function GoalTaskPlannerModal({
  isOpen,
  goal,
  milestones,
  boards,
  defaultBoardId,
  onClose,
  onGenerate,
  onCreate,
}: GoalTaskPlannerModalProps) {
  const [boardId, setBoardId] = useState('')
  const [column, setColumn] = useState<GoalTaskPlanOptions['column']>(DEFAULT_OPTIONS.column)
  const [horizonDays, setHorizonDays] = useState(DEFAULT_OPTIONS.horizonDays)
  const [maxTasks, setMaxTasks] = useState(DEFAULT_OPTIONS.maxTasks)
  const [suggestions, setSuggestions] = useState<GoalTaskSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<string, GoalTaskSuggestion[]>()
    suggestions.forEach((suggestion) => {
      const key = suggestion.milestoneTitle || 'Goal'
      const list = groups.get(key) || []
      list.push(suggestion)
      groups.set(key, list)
    })
    return [...groups.entries()]
  }, [suggestions])

  const selectedCount = suggestions.filter(suggestion => suggestion.accepted).length

  useEffect(() => {
    if (!isOpen) return
    const initialBoardId = defaultBoardId || boards[0]?.id || ''
    setBoardId(initialBoardId)
    setColumn(DEFAULT_OPTIONS.column)
    setHorizonDays(DEFAULT_OPTIONS.horizonDays)
    setMaxTasks(DEFAULT_OPTIONS.maxTasks)
    setSuggestions([])
    setError(null)
    setResult(null)
  }, [isOpen, defaultBoardId, boards])

  if (!isOpen || !goal) return null

  const options: GoalTaskPlanOptions = {
    boardId,
    column,
    horizonDays,
    maxTasks,
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const generated = await onGenerate(goal.id, options)
      setSuggestions(generated)
      if (generated.length === 0) {
        setResult('No new suggestions available. Existing linked tasks may already cover this goal.')
      }
    } catch {
      setError('Failed to generate suggestions. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!boardId) {
      setError('Select a board first.')
      return
    }

    if (selectedCount === 0) {
      setError('Select at least one task to create.')
      return
    }

    setSaving(true)
    setError(null)
    setResult(null)

    try {
      const output = await onCreate(goal.id, suggestions, options)
      setResult(`Created ${output.created} task${output.created === 1 ? '' : 's'}${output.skipped > 0 ? `, skipped ${output.skipped}` : ''}.`)
      if (output.created > 0) {
        setSuggestions([])
      }
    } catch {
      setError('Failed to create tasks. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateSuggestion = (id: string, updates: Partial<GoalTaskSuggestion>) => {
    setSuggestions(prev => prev.map(suggestion => (
      suggestion.id === id ? { ...suggestion, ...updates } : suggestion
    )))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Goal Task Planner"
      description="Generate and review linked tasks from milestones."
      size="xl"
      className="max-h-[90vh] overflow-hidden"
    >
      <div className="space-y-4">
        <div className="border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Goal</p>
          <p className="mt-1 text-[13px] text-[var(--text-primary)]">{goal.title}</p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            {milestones.filter(milestone => !milestone.isCompleted).length} incomplete milestone(s)
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Board</span>
            <select
              value={boardId}
              onChange={(event) => setBoardId(event.target.value)}
              className="w-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-2 text-[12px] text-[var(--text-primary)] outline-none"
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Column</span>
            <select
              value={column}
              onChange={(event) => setColumn(event.target.value as GoalTaskPlanOptions['column'])}
              className="w-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-2 text-[12px] text-[var(--text-primary)] outline-none"
            >
              {COLUMNS.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Horizon</span>
            <select
              value={horizonDays}
              onChange={(event) => setHorizonDays(Number(event.target.value))}
              className="w-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-2 text-[12px] text-[var(--text-primary)] outline-none"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Max tasks</span>
            <select
              value={maxTasks}
              onChange={(event) => setMaxTasks(Number(event.target.value))}
              className="w-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-2 text-[12px] text-[var(--text-primary)] outline-none"
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={9}>9</option>
            </select>
          </label>
        </div>

        {boards.length === 0 && (
          <p className="text-[11px] text-[var(--text-tertiary)]">
            You can generate suggestions now. A board will be required when creating tasks.
          </p>
        )}

        <div className="flex items-center justify-between border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {suggestions.length === 0 ? 'No suggestions generated yet.' : `${selectedCount} of ${suggestions.length} selected`}
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || saving || !boardId}
            className="inline-flex items-center gap-2 border border-[var(--accent-muted)] bg-[var(--accent-glow)] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] disabled:opacity-60"
          >
            <Sparkles size={12} />
            {loading ? 'Generating...' : suggestions.length === 0 ? 'Generate Plan' : 'Regenerate'}
          </button>
        </div>

        {error && (
          <p className="text-[11px] text-red-400">{error}</p>
        )}

        {result && (
          <p className="text-[11px] text-[var(--success)]">{result}</p>
        )}

        {suggestions.length > 0 && (
          <div className="max-h-[42vh] overflow-y-auto space-y-3 pr-1">
            {groupedSuggestions.map(([groupTitle, items]) => (
              <div key={groupTitle} className="border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">{groupTitle}</p>
                  <Badge variant="muted">{items.length} task{items.length === 1 ? '' : 's'}</Badge>
                </div>

                <div className="space-y-3">
                  {items.map((suggestion) => (
                    <div key={suggestion.id} className="border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3">
                      <label className="mb-2 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={suggestion.accepted}
                          onChange={(event) => updateSuggestion(suggestion.id, { accepted: event.target.checked })}
                          className="h-3.5 w-3.5"
                        />
                        Create this task
                      </label>

                      <input
                        type="text"
                        value={suggestion.title}
                        onChange={(event) => updateSuggestion(suggestion.id, { title: event.target.value })}
                        className="w-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none"
                      />

                      <textarea
                        value={suggestion.description || ''}
                        onChange={(event) => updateSuggestion(suggestion.id, { description: event.target.value || undefined })}
                        rows={2}
                        className="mt-2 w-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none resize-none"
                      />

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={suggestion.dueDate || ''}
                          onChange={(event) => updateSuggestion(suggestion.id, { dueDate: event.target.value || undefined })}
                          className="border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none"
                        />

                        <select
                          value={suggestion.priority}
                          onChange={(event) => updateSuggestion(suggestion.id, { priority: event.target.value as Priority })}
                          className="border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none"
                        >
                          {PRIORITIES.map((priorityOption) => (
                            <option key={priorityOption.id} value={priorityOption.id}>{priorityOption.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalActions>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || loading || selectedCount === 0}
          className="px-3 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-60"
        >
          {saving ? 'Creating...' : `Create ${selectedCount} Task${selectedCount === 1 ? '' : 's'}`}
        </button>
      </ModalActions>
    </Modal>
  )
}
