'use client'

import { useState, useMemo } from 'react'
import { Plus, ListChecks, Sun, Moon, Briefcase, Home, Building2, Dumbbell, Coffee, BookOpen, Brain, Sparkles, Check } from 'lucide-react'
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

// Routine templates configuration
const ROUTINE_TEMPLATES = [
  {
    id: 'morning',
    name: 'Morning Routine',
    description: 'Start your day right',
    icon: Sun,
    color: 'text-amber-400',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[],
    items: ['Wake up & stretch', 'Drink water', 'Meditate for 10 min', 'Review daily goals'],
  },
  {
    id: 'evening',
    name: 'Evening Routine',
    description: 'Wind down & reflect',
    icon: Moon,
    color: 'text-indigo-400',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[],
    items: ['Review the day', 'Plan tomorrow', 'Gratitude journaling', 'Read for 20 min'],
  },
  {
    id: 'work',
    name: 'Work Start',
    description: 'Weekday productivity',
    icon: Briefcase,
    color: 'text-blue-400',
    daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[],
    items: ['Check calendar', 'Review priorities', 'Clear inbox to zero', 'Deep work block'],
  },
  {
    id: 'workout',
    name: 'Workout Routine',
    description: 'Stay active & healthy',
    icon: Dumbbell,
    color: 'text-green-400',
    daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[],
    items: ['Warm up (5 min)', 'Main workout', 'Cool down stretches', 'Log workout'],
  },
  {
    id: 'wfh-start',
    name: 'WFH Morning',
    description: 'Remote work kickoff',
    icon: Home,
    color: 'text-violet-400',
    daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[],
    location: 'wfh' as WorkLocation,
    items: ['Get dressed properly', 'Set up workspace', 'Check Slack/Teams', 'Block focus time'],
  },
  {
    id: 'office-start',
    name: 'Office Arrival',
    description: 'In-office kickoff',
    icon: Building2,
    color: 'text-orange-400',
    daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[],
    location: 'office' as WorkLocation,
    items: ['Settle in & coffee', 'Quick desk tidy', 'Check in with team', 'Review meeting schedule'],
  },
  {
    id: 'focus',
    name: 'Deep Focus Block',
    description: 'Distraction-free work',
    icon: Brain,
    color: 'text-pink-400',
    daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[],
    items: ['Silence notifications', 'Set timer for 90 min', 'Work on ONE task', 'Take a proper break'],
  },
  {
    id: 'learning',
    name: 'Learning Session',
    description: 'Daily skill building',
    icon: BookOpen,
    color: 'text-cyan-400',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[],
    items: ['Pick one topic', 'Read/watch for 30 min', 'Take notes', 'Practice or apply'],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Sunday planning',
    icon: Sparkles,
    color: 'text-yellow-400',
    daysOfWeek: [7] as DayOfWeek[], // Sunday only
    items: ['Review past week wins', 'Check goal progress', 'Plan next week', 'Clear task backlog'],
  },
]

interface RoutineTemplatesProps {
  routines: Routine[]
  onAddRoutine: (name: string, daysOfWeek: DayOfWeek[], description?: string, location?: WorkLocation) => Promise<string>
  onAddItem: (routineId: string, title: string) => Promise<string>
}

function RoutineTemplates({ routines, onAddRoutine, onAddItem }: RoutineTemplatesProps) {
  const [addedTemplates, setAddedTemplates] = useState<Set<string>>(new Set())

  // Check which templates already exist (by name match)
  const existingNames = useMemo(() =>
    new Set(routines.map(r => r.name.toLowerCase())),
    [routines]
  )

  const availableTemplates = ROUTINE_TEMPLATES.filter(
    t => !existingNames.has(t.name.toLowerCase()) && !addedTemplates.has(t.id)
  )

  if (availableTemplates.length === 0) {
    return null
  }

  const handleAddTemplate = async (template: typeof ROUTINE_TEMPLATES[0]) => {
    const id = await onAddRoutine(
      template.name,
      template.daysOfWeek,
      template.description,
      template.location
    )
    if (id) {
      for (const item of template.items) {
        await onAddItem(id, item)
      }
      setAddedTemplates(prev => new Set([...prev, template.id]))
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
      <h3 className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-4">
        Quick-Add Templates
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {availableTemplates.map((template) => {
          const Icon = template.icon
          return (
            <button
              key={template.id}
              onClick={() => handleAddTemplate(template)}
              className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left group"
            >
              <div className={cn('p-2 bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-elevated)]', template.color)}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                  {template.name}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                  {template.description}
                </p>
              </div>
              <Plus size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function RoutinesPage() {
  const {
    routines,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineItem,
    updateRoutineItem,
    deleteRoutineItem,
    getRoutineItems,
    getTodaysRoutines,
    getRoutineProgress,
    isItemCompleted,
    toggleItem,
  } = useRoutines()

  const { getTodaysLocation } = useWorkLocation()

  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showMobileViewMenu, setShowMobileViewMenu] = useState(false)
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
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Routines</h1>
          </div>

          {/* View mode tabs */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileViewMenu((prev) => !prev)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-tertiary)]"
            >
              View: {viewMode === 'today' ? 'Today' : 'All'}
            </button>
            {showMobileViewMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMobileViewMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-[180px] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/40 z-20">
                  <button
                    onClick={() => {
                      setViewMode('today')
                      setShowMobileViewMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors',
                      viewMode === 'today'
                        ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('all')
                      setShowMobileViewMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors',
                      viewMode === 'all'
                        ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    All Routines
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1 overflow-x-auto whitespace-nowrap max-w-[55vw] sm:max-w-none">
            <button
              onClick={() => setViewMode('today')}
              className={cn(
                'px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-3 sm:py-1.5 sm:text-[11px]',
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
                'px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-3 sm:py-1.5 sm:text-[11px]',
                viewMode === 'all'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All Routines</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingRoutine(undefined)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] sm:text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Routine</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Today's Stats (only show in today view) */}
          {viewMode === 'today' && (
            <>
              {/* Work location indicator */}
              {todaysLocation && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 border text-[11px]',
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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
                  onUpdateItem={updateRoutineItem}
                  onDeleteItem={deleteRoutineItem}
                />
              ))}
            </div>
          )}

          {/* Routine Templates - always visible */}
          <RoutineTemplates
            routines={routines}
            onAddRoutine={addRoutine}
            onAddItem={addRoutineItem}
          />
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
