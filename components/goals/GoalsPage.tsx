'use client'

import { useState, useMemo } from 'react'
import { Plus, Flag } from 'lucide-react'
import { useGoals } from '@/hooks/useGoals'
import { useBoards } from '@/hooks/useBoards'
import { Goal, GoalStatus, GOAL_STATUSES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState, LoadingState } from '@/components/ui/EmptyState'
import { GoalCard } from './GoalCard'
import { GoalEditor } from './GoalEditor'
import { GoalTaskPlannerModal } from './GoalTaskPlannerModal'

type FilterStatus = 'all' | GoalStatus

export function GoalsPage() {
  const {
    goals,
    categories,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
    completeGoal,
    addMilestone,
    toggleMilestone,
    generateTaskSuggestions,
    createTasksFromSuggestions,
    getMilestones,
    getActiveGoals,
  } = useGoals()
  const { boards, activeBoardId } = useBoards()

  const [showEditor, setShowEditor] = useState(false)
  const [showPlanner, setShowPlanner] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [planningGoal, setPlanningGoal] = useState<Goal | undefined>()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showMobileFilterMenu, setShowMobileFilterMenu] = useState(false)

  const activeGoals = useMemo(() => getActiveGoals(), [getActiveGoals])

  const filteredGoals = useMemo(() => {
    if (filterStatus === 'all') return goals
    return goals.filter(g => g.status === filterStatus)
  }, [goals, filterStatus])

  const stats = useMemo(() => {
    const total = goals.length
    const active = goals.filter(g => g.status === 'active').length
    const completed = goals.filter(g => g.status === 'completed').length
    const avgProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
      : 0

    return { total, active, completed, avgProgress }
  }, [goals, activeGoals])

  const handleSaveGoal = async (
    goalData: Omit<Goal, 'id' | 'createdAt' | 'order'>,
    milestonesTitles: string[]
  ) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData)
      // Note: Milestone updates would need more complex handling for edits
    } else {
      const goalId = await addGoal(goalData)
      if (goalId) {
        for (const title of milestonesTitles) {
          await addMilestone(goalId, title)
        }
      }
    }
    setEditingGoal(undefined)
    setShowEditor(false)
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setShowEditor(true)
  }

  const handlePlan = (goal: Goal) => {
    setPlanningGoal(goal)
    setShowPlanner(true)
  }

  if (loading) {
    return <LoadingState message="Loading goals..." />
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Flag size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Goals</h1>
          </div>

          {/* Filter tabs */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileFilterMenu((prev) => !prev)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-tertiary)]"
            >
              Filter: {filterStatus === 'all' ? 'All' : filterStatus}
            </button>
            {showMobileFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMobileFilterMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-[180px] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/40 z-20">
                  <button
                    onClick={() => {
                      setFilterStatus('all')
                      setShowMobileFilterMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[12px] sm:text-[11px] uppercase tracking-[0.1em] transition-colors',
                      filterStatus === 'all'
                        ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    All
                  </button>
                  {GOAL_STATUSES.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => {
                        setFilterStatus(status.id)
                        setShowMobileFilterMenu(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[12px] sm:text-[11px] uppercase tracking-[0.1em] transition-colors',
                        filterStatus === status.id
                          ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1 overflow-x-auto whitespace-nowrap max-w-[55vw] sm:max-w-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-3 sm:py-1.5 sm:text-[11px]',
                filterStatus === 'all'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              All
            </button>
            {GOAL_STATUSES.map((status) => (
              <button
                key={status.id}
                onClick={() => setFilterStatus(status.id)}
                className={cn(
                  'px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-3 sm:py-1.5 sm:text-[11px]',
                  filterStatus === status.id
                    ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setEditingGoal(undefined)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] sm:text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Goal</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--text-primary)]">{stats.total}</p>
                <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Total Goals
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--accent)]">{stats.active}</p>
                <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Active
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="text-center">
                <p className="text-3xl font-medium text-[var(--success)]">{stats.completed}</p>
                <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Completed
                </p>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <div className="flex items-center justify-center gap-3">
                <ProgressRing value={stats.avgProgress} size={50} strokeWidth={4} color="var(--goal-progress)" />
                <div>
                  <p className="text-lg font-medium text-[var(--text-primary)]">{stats.avgProgress}%</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                    Avg Progress
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Goals List */}
          {filteredGoals.length === 0 ? (
            <EmptyState
              icon="goals"
              title={filterStatus === 'all' ? 'No goals yet' : `No ${filterStatus} goals`}
              description="Set meaningful goals and break them down into achievable milestones"
              action={filterStatus === 'all' ? {
                label: 'Create Goal',
                onClick: () => setShowEditor(true),
              } : undefined}
            />
          ) : (
            <div className="grid gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  milestones={getMilestones(goal.id)}
                  onEdit={() => handleEdit(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                  onArchive={() => archiveGoal(goal.id)}
                  onComplete={() => completeGoal(goal.id)}
                  onPlanTasks={() => handlePlan(goal)}
                  onToggleMilestone={toggleMilestone}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Goal Editor Modal */}
      <GoalEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false)
          setEditingGoal(undefined)
        }}
        onSave={handleSaveGoal}
        goal={editingGoal}
        existingMilestones={editingGoal ? getMilestones(editingGoal.id) : []}
        categories={categories}
      />

      <GoalTaskPlannerModal
        isOpen={showPlanner}
        goal={planningGoal}
        milestones={planningGoal ? getMilestones(planningGoal.id) : []}
        boards={boards}
        defaultBoardId={activeBoardId}
        onClose={() => {
          setShowPlanner(false)
          setPlanningGoal(undefined)
        }}
        onGenerate={generateTaskSuggestions}
        onCreate={createTasksFromSuggestions}
      />
    </div>
  )
}
