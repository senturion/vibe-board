'use client'

import { useState, useMemo } from 'react'
import { Plus, ListChecks, Sun, Moon, Briefcase, Home, Building2 } from 'lucide-react'
import { useRoutines } from '@/hooks/useRoutines'
import { useWorkLocation } from '@/contexts/WorkLocationContext'
import { Routine, DayOfWeek, WorkLocation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState, LoadingState } from '@/components/ui/EmptyState'
import { RoutineCard } from './RoutineCard'
import { RoutineEditor } from './RoutineEditor'

type ViewMode = 'today' | 'all'

export function RoutinesPage() {
  const {
    routines,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineItem,
    getRoutineItems,
    getTodaysRoutines,
    getRoutineProgress,
    isItemCompleted,
    toggleItem,
  } = useRoutines()

  const { getTodaysLocation } = useWorkLocation()

  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showEditor, setShowEditor] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>()

  const todaysLocation = getTodaysLocation()
  const todaysRoutines = useMemo(
    () => getTodaysRoutines(todaysLocation),
    [getTodaysRoutines, todaysLocation]
  )

  const todayStats = useMemo(() => {
    let totalItems = 0
    let completedItems = 0

    todaysRoutines.forEach(routine => {
      const progress = getRoutineProgress(routine.id)
      totalItems += progress.total
      completedItems += progress.completed
    })

    return {
      routines: todaysRoutines.length,
      totalItems,
      completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    }
  }, [todaysRoutines, getRoutineProgress])

  const handleSaveRoutine = async (name: string, daysOfWeek: DayOfWeek[], description?: string, location?: WorkLocation) => {
    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, { name, daysOfWeek, description, location })
    } else {
      await addRoutine(name, daysOfWeek, description, location)
    }
    setEditingRoutine(undefined)
    setShowEditor(false)
  }

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine)
    setShowEditor(true)
  }

  const displayedRoutines = viewMode === 'today' ? todaysRoutines : routines

  if (loading) {
    return <LoadingState message="Loading routines..." />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ListChecks size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Routines</h1>
          </div>

          {/* View mode tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1">
            <button
              onClick={() => setViewMode('today')}
              className={cn(
                'px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors',
                viewMode === 'today'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                'px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors',
                viewMode === 'all'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              All Routines
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingRoutine(undefined)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          New Routine
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Today's Stats (only show in today view) */}
          {viewMode === 'today' && (
            <>
              {/* Work location indicator */}
              {todaysLocation && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 border',
                  todaysLocation === 'wfh'
                    ? 'bg-indigo-500/5 border-indigo-500/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                )}>
                  {todaysLocation === 'wfh' ? (
                    <Home size={14} className="text-indigo-400" />
                  ) : (
                    <Building2 size={14} className="text-amber-400" />
                  )}
                  <span className={cn(
                    'text-[11px]',
                    todaysLocation === 'wfh' ? 'text-indigo-400' : 'text-amber-400'
                  )}>
                    Showing routines for: {todaysLocation === 'wfh' ? 'Work from Home' : 'Office'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Card variant="bordered" padding="md">
                  <div className="flex items-center gap-4">
                    <ProgressRing
                      value={todayStats.percentage}
                      size={60}
                      strokeWidth={5}
                      color="var(--success)"
                    />
                    <div>
                      <p className="text-2xl font-medium text-[var(--text-primary)]">
                        {todayStats.percentage}%
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                        Complete
                      </p>
                    </div>
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <div className="text-center">
                    <p className="text-3xl font-medium text-[var(--text-primary)]">
                      {todayStats.completedItems}/{todayStats.totalItems}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                      Items Done
                    </p>
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <div className="text-center">
                    <p className="text-3xl font-medium text-[var(--accent)]">
                      {todayStats.routines}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                      Active Routines
                    </p>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Routines List */}
          {displayedRoutines.length === 0 ? (
            <EmptyState
              icon="routines"
              title={viewMode === 'today' ? 'No routines for today' : 'No routines yet'}
              description={viewMode === 'today'
                ? 'Create routines and assign them to today'
                : 'Create daily routines to build consistency'
              }
              action={{
                label: 'Create Routine',
                onClick: () => setShowEditor(true),
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayedRoutines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  items={getRoutineItems(routine.id)}
                  progress={getRoutineProgress(routine.id)}
                  isItemCompleted={isItemCompleted}
                  onToggleItem={toggleItem}
                  onEdit={() => handleEdit(routine)}
                  onDelete={() => deleteRoutine(routine.id)}
                  onAddItem={(title) => addRoutineItem(routine.id, title)}
                />
              ))}
            </div>
          )}

          {/* Suggested routines (only show when no routines) */}
          {routines.length === 0 && (
            <div className="mt-8">
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-4">
                Suggested Routines
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  onClick={async () => {
                    const id = await addRoutine('Morning Routine', [1, 2, 3, 4, 5, 6, 7])
                    if (id) {
                      await addRoutineItem(id, 'Wake up & stretch')
                      await addRoutineItem(id, 'Drink water')
                      await addRoutineItem(id, 'Meditate')
                      await addRoutineItem(id, 'Review goals')
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors text-left"
                >
                  <Sun size={20} className="text-[var(--accent)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Morning Routine</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Start your day right</p>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    const id = await addRoutine('Work Routine', [1, 2, 3, 4, 5])
                    if (id) {
                      await addRoutineItem(id, 'Check calendar')
                      await addRoutineItem(id, 'Review priorities')
                      await addRoutineItem(id, 'Deep work session')
                      await addRoutineItem(id, 'Process inbox')
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors text-left"
                >
                  <Briefcase size={20} className="text-[var(--chart-2)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Work Routine</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Weekday productivity</p>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    const id = await addRoutine('Evening Routine', [1, 2, 3, 4, 5, 6, 7])
                    if (id) {
                      await addRoutineItem(id, 'Review the day')
                      await addRoutineItem(id, 'Plan tomorrow')
                      await addRoutineItem(id, 'Wind down')
                      await addRoutineItem(id, 'Read')
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors text-left"
                >
                  <Moon size={20} className="text-[var(--chart-3)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Evening Routine</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">End your day well</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Routine Editor Modal */}
      <RoutineEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false)
          setEditingRoutine(undefined)
        }}
        onSave={handleSaveRoutine}
        routine={editingRoutine}
      />
    </div>
  )
}
