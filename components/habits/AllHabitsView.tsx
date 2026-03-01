import { Habit, HabitStreak } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { HabitCard } from './HabitCard'

interface AllHabitsViewProps {
  habits: Habit[]
  logDate: Date
  isLogDateToday: boolean
  getCompletionStatus: (habitId: string, date: Date) => { isComplete: boolean; count: number; target: number }
  getStreak: (habitId: string) => HabitStreak | undefined
  onToggle: (habitId: string) => void
  onEdit: (habit: Habit) => void
  onDelete: (habitId: string) => void
  onArchive: (habitId: string) => void
  onViewStats: (habit: Habit) => void
  onCreateHabit: () => void
}

export function AllHabitsView({
  habits,
  logDate,
  isLogDateToday,
  getCompletionStatus,
  getStreak,
  onToggle,
  onEdit,
  onDelete,
  onArchive,
  onViewStats,
  onCreateHabit,
}: AllHabitsViewProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {habits.length === 0 ? (
        <EmptyState
          icon="habits"
          title="No habits yet"
          description="Create habits to track your daily routines and build consistency"
          action={{
            label: 'Create Habit',
            onClick: onCreateHabit,
          }}
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const status = getCompletionStatus(habit.id, logDate)
            const streak = getStreak(habit.id)
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                completionStatus={{ completed: status.isComplete, count: status.count, target: status.target }}
                streak={{ current: streak?.currentStreak || 0, best: streak?.bestStreak || 0 }}
                onToggle={() => onToggle(habit.id)}
                onEdit={() => onEdit(habit)}
                onDelete={() => onDelete(habit.id)}
                onArchive={() => onArchive(habit.id)}
                onViewStats={() => onViewStats(habit)}
                showRisk={isLogDateToday}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
