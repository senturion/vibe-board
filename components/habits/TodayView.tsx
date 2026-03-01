import { Flame } from 'lucide-react'
import { Habit, HabitStreak } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState } from '@/components/ui/EmptyState'
import { HabitCard } from './HabitCard'

interface TodayViewProps {
  activeHabitsForDate: Habit[]
  dayStats: { completed: number; total: number; percentage: number }
  isLogDateToday: boolean
  logDate: Date
  weeklyPercentage: number
  bestStreak: number
  getCompletionStatus: (habitId: string, date: Date) => { isComplete: boolean; count: number; target: number }
  getStreak: (habitId: string) => HabitStreak | undefined
  onToggle: (habitId: string) => void
  onEdit: (habit: Habit) => void
  onDelete: (habitId: string) => void
  onArchive: (habitId: string) => void
  onViewStats: (habit: Habit) => void
  onCreateHabit: () => void
}

export function TodayView({
  activeHabitsForDate,
  dayStats,
  isLogDateToday,
  logDate,
  weeklyPercentage,
  bestStreak,
  getCompletionStatus,
  getStreak,
  onToggle,
  onEdit,
  onDelete,
  onArchive,
  onViewStats,
  onCreateHabit,
}: TodayViewProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-4">
            <ProgressRing
              value={dayStats.percentage}
              size={60}
              strokeWidth={5}
              color="var(--success)"
            />
            <div>
              <p className="text-2xl font-medium text-[var(--text-primary)]">
                {dayStats.completed}/{dayStats.total}
              </p>
              <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {isLogDateToday ? 'Today' : 'Day'}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-4">
            <div className="w-[60px] h-[60px] flex items-center justify-center bg-[var(--accent-glow)] border border-[var(--accent-muted)]">
              <Flame size={24} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-2xl font-medium text-[var(--text-primary)]">
                {bestStreak}
              </p>
              <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                Best Streak
              </p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-4">
            <ProgressRing
              value={weeklyPercentage}
              size={60}
              strokeWidth={5}
              color="var(--chart-2)"
            />
            <div>
              <p className="text-2xl font-medium text-[var(--text-primary)]">
                {weeklyPercentage}%
              </p>
              <p className="text-[12px] sm:text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                This Week
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Habit list */}
      <Card variant="bordered" padding="none">
        <CardHeader className="px-4 pt-4">
          <CardTitle>
            {isLogDateToday
              ? "Today's Habits"
              : `Habits for ${logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeHabitsForDate.length === 0 ? (
            <EmptyState
              icon="habits"
              title={isLogDateToday ? 'No habits for today' : 'No habits for this day'}
              description="Create your first habit to start tracking"
              action={{
                label: 'Create Habit',
                onClick: onCreateHabit,
              }}
              size="sm"
            />
          ) : (
            <div className="space-y-2 p-4 pt-0">
              {activeHabitsForDate.map((habit) => {
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
        </CardContent>
      </Card>
    </div>
  )
}
