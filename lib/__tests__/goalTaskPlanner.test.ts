import { describe, expect, it } from 'vitest'
import { Goal, GoalTaskPlanOptions, Milestone } from '@/lib/types'
import { buildGoalTaskPlanHash, generateGoalTaskSuggestions } from '@/lib/planner/goalTaskPlanner'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Launch portfolio website',
    startDate: '2026-02-07',
    status: 'active',
    progress: 25,
    priority: 'medium',
    order: 0,
    createdAt: 1,
    ...overrides,
  }
}

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: `ms-${Math.random()}`,
    goalId: 'goal-1',
    title: 'Default milestone',
    isCompleted: false,
    order: 0,
    createdAt: 1,
    ...overrides,
  }
}

const baseOptions: GoalTaskPlanOptions = {
  boardId: 'board-1',
  column: 'todo',
  horizonDays: 14,
  maxTasks: 5,
}

describe('buildGoalTaskPlanHash', () => {
  it('returns stable hash for same inputs', () => {
    const goalId = 'goal-123'
    const milestones = [
      makeMilestone({ id: 'm1', title: 'Outline', order: 0 }),
      makeMilestone({ id: 'm2', title: 'Draft', order: 1 }),
    ]

    const hash1 = buildGoalTaskPlanHash(goalId, milestones, baseOptions)
    const hash2 = buildGoalTaskPlanHash(goalId, milestones, baseOptions)

    expect(hash1).toBe(hash2)
  })

  it('changes hash when options change', () => {
    const milestones = [makeMilestone({ id: 'm1', title: 'Outline' })]

    const hash1 = buildGoalTaskPlanHash('goal-1', milestones, baseOptions)
    const hash2 = buildGoalTaskPlanHash('goal-1', milestones, {
      ...baseOptions,
      horizonDays: 30,
    })

    expect(hash1).not.toBe(hash2)
  })
})

describe('generateGoalTaskSuggestions', () => {
  it('prioritizes incomplete milestones and respects maxTasks', () => {
    const now = new Date('2026-02-07T10:00:00')
    const goal = makeGoal({ priority: 'high' })
    const milestones = [
      makeMilestone({ id: 'm1', title: 'Scope features', order: 0, targetDate: '2026-02-10' }),
      makeMilestone({ id: 'm2', title: 'Write copy', order: 1, targetDate: '2026-02-20' }),
      makeMilestone({ id: 'm3', title: 'Archived milestone', order: 2, isCompleted: true }),
    ]

    const suggestions = generateGoalTaskSuggestions({
      goal,
      milestones,
      options: { ...baseOptions, maxTasks: 4 },
      now,
    })

    expect(suggestions).toHaveLength(4)
    expect(suggestions.every((item) => item.priority === 'high' || item.priority === 'medium')).toBe(true)
    expect(suggestions.every((item) => item.milestoneTitle !== 'Archived milestone')).toBe(true)
  })

  it('deduplicates against existing linked task titles', () => {
    const goal = makeGoal()
    const milestones = [makeMilestone({ id: 'm1', title: 'Scope features' })]
    const baseline = generateGoalTaskSuggestions({
      goal,
      milestones,
      options: baseOptions,
      now: new Date('2026-02-07T10:00:00'),
    })

    const duplicateTitle = baseline[0]?.title
    expect(duplicateTitle).toBeTruthy()

    const suggestions = generateGoalTaskSuggestions({
      goal,
      milestones,
      options: baseOptions,
      existingTaskTitles: [duplicateTitle!],
      now: new Date('2026-02-07T10:00:00'),
    })

    expect(suggestions.some((item) => item.title === duplicateTitle)).toBe(false)
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('falls back to goal-level suggestions when no incomplete milestones exist', () => {
    const goal = makeGoal({ title: 'Run a 10K race', targetDate: '2026-03-01' })
    const milestones = [makeMilestone({ id: 'm1', title: 'Done', isCompleted: true })]

    const suggestions = generateGoalTaskSuggestions({
      goal,
      milestones,
      options: { ...baseOptions, maxTasks: 2 },
      now: new Date('2026-02-07T10:00:00'),
    })

    expect(suggestions).toHaveLength(2)
    expect(suggestions.every((item) => item.milestoneTitle === 'Run a 10K race')).toBe(true)
  })

  it('uses milestone intent to generate non-generic writing tasks', () => {
    const goal = makeGoal({ title: 'Publish technical posts' })
    const milestones = [makeMilestone({ id: 'm1', title: 'Write first blog post' })]

    const suggestions = generateGoalTaskSuggestions({
      goal,
      milestones,
      options: { ...baseOptions, maxTasks: 3 },
      now: new Date('2026-02-07T10:00:00'),
    })

    expect(suggestions).toHaveLength(3)
    expect(suggestions[0].title).toContain('Outline')
    expect(suggestions[1].title).toContain('Draft')
    expect(suggestions[2].title).toContain('Edit and finalize')
  })
})
