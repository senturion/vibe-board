import { BarChart3, Calendar } from 'lucide-react'
import { Habit, HabitCompletion, HabitStreak } from '@/lib/types'
import { useHabitAnalytics, useAllHabitsAnalytics } from '@/hooks/useHabitAnalytics'
import { useMostImprovedHabits } from '@/hooks/useMostImprovedHabits'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatBadge } from '@/components/ui/Badge'
import { HabitHeatmap } from './HabitHeatmap'

interface AnalyticsViewProps {
  habits: Habit[]
  completions: HabitCompletion[]
  completionsByDate: Map<string, Map<string, number>>
  selectedHabit: Habit | undefined
  onSelectHabit: (habit: Habit) => void
  getStreak: (habitId: string) => HabitStreak | undefined
}

export function AnalyticsView({
  habits,
  completions,
  completionsByDate,
  selectedHabit,
  onSelectHabit,
  getStreak,
}: AnalyticsViewProps) {
  const { settings } = useSettings()
  const { weeklyStats, weeklyTrend, trend } = useAllHabitsAnalytics(habits, completions)
  const mostImprovedHabits = useMostImprovedHabits(habits, completionsByDate, settings.weekStartsOn)

  const selectedStreak = selectedHabit ? getStreak(selectedHabit.id) : undefined
  const selectedHabitAnalytics = useHabitAnalytics({
    habit: selectedHabit,
    completions,
    streak: selectedStreak ? { current: selectedStreak.currentStreak, best: selectedStreak.bestStreak } : undefined,
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Habit selector */}
      <Card variant="bordered" padding="md">
        <CardHeader>
          <CardTitle>Select Habit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {habits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => onSelectHabit(habit)}
                className={cn(
                  'px-3 py-2 text-[13px] sm:text-[12px] border transition-colors',
                  selectedHabit?.id === habit.id
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                {habit.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedHabit ? (
        <>
          {/* Per-habit stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBadge
              value={selectedHabitAnalytics.stats.totalCompletions}
              label={selectedHabit.habitType === 'avoid' && selectedHabit.trackingMode === 'auto-complete' ? 'Total Slips' : 'Total Completions'}
              icon="target"
            />
            <StatBadge
              value={`${selectedHabitAnalytics.stats.completionRate}%`}
              label={selectedHabit.habitType === 'avoid' && selectedHabit.trackingMode === 'auto-complete' ? 'Success Rate' : 'Completion Rate'}
              icon="zap"
            />
            <StatBadge
              value={selectedHabitAnalytics.stats.currentStreak}
              label="Current Streak"
              icon="star"
              variant="accent"
            />
            <StatBadge
              value={selectedHabitAnalytics.stats.bestStreak}
              label="Best Streak"
              icon="trophy"
            />
          </div>

          {/* Heatmap */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>
                <Calendar size={14} className="mr-2 inline" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HabitHeatmap data={selectedHabitAnalytics.heatmapData} />
            </CardContent>
          </Card>

          {/* Weekly chart */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>
                <BarChart3 size={14} className="mr-2 inline" />
                {selectedHabit.habitType === 'avoid' && selectedHabit.trackingMode === 'auto-complete' ? 'Weekly Success Rate' : 'Weekly Completion Rate'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedHabitAnalytics.completionRateByWeek.map((week, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-12 text-[12px] sm:text-[11px] text-[var(--text-tertiary)]">
                      {week.week}
                    </span>
                    <div className="flex-1 h-4 bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)] animate-bar-grow"
                        style={{
                          width: `${week.rate}%`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[13px] sm:text-[12px] text-[var(--text-secondary)]">
                      {week.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBadge
              value={habits.filter(h => h.isActive).length}
              label="Active Habits"
              icon="target"
            />
            <StatBadge
              value={`${weeklyStats.percentage}%`}
              label="This Week"
              icon="zap"
              variant="accent"
            />
            <StatBadge
              value={`${Math.round(
                weeklyTrend.slice(-4).reduce((sum, w) => sum + w.rate, 0) /
                Math.max(weeklyTrend.slice(-4).length, 1)
              )}%`}
              label="4-Week Avg"
              icon="star"
            />
            <StatBadge
              value={trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Flat'}
              label="Trend"
              icon="trophy"
            />
          </div>

          {/* Weekly trend */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>
                <BarChart3 size={14} className="mr-2 inline" />
                Weekly Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklyTrend.map((week, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-12 text-[12px] sm:text-[11px] text-[var(--text-tertiary)]">
                      {week.week}
                    </span>
                    <div className="flex-1 h-4 bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)] animate-bar-grow"
                        style={{
                          width: `${week.rate}%`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[13px] sm:text-[12px] text-[var(--text-secondary)]">
                      {week.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most improved */}
          <Card variant="bordered" padding="md">
            <CardHeader>
              <CardTitle>
                <BarChart3 size={14} className="mr-2 inline" />
                Most Improved Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mostImprovedHabits.length === 0 ? (
                <p className="text-[13px] sm:text-[12px] text-[var(--text-tertiary)]">
                  No improvement trend yet. Keep logging to see momentum.
                </p>
              ) : (
                <div className="space-y-2">
                  {mostImprovedHabits.map(({ habit, improvement, recentAvg, prevAvg }) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-2 border border-[var(--border-subtle)]"
                      style={{ borderLeft: `3px solid ${habit.color}` }}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] sm:text-[12px] text-[var(--text-primary)] truncate">{habit.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {prevAvg}% &rarr; {recentAvg}%
                        </p>
                      </div>
                      <span className="text-[13px] sm:text-[12px] text-[var(--success)] font-medium">
                        +{improvement}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
