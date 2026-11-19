'use client'

import { useMemo } from 'react'
import { useKanban } from '@/hooks/useKanban'
import { useBoards } from '@/hooks/useBoards'
import { useHabits } from '@/hooks/useHabits'
import { HabitRing } from '@/components/habits/HabitRing'
import { dayProgress, habitActionLabel } from '@/lib/habitRing'
import { useRoutines } from '@/hooks/useRoutines'
import { useJournal } from '@/hooks/useJournal'
import { useGoals } from '@/hooks/useGoals'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useNavigation } from '@/contexts/NavigationContext'
import { useUIStateContext } from '@/contexts/UIStateContext'
import { useWorkLocation } from '@/contexts/WorkLocationContext'
import { KanbanTask, PRIORITIES, formatDateKey, parseDateKey } from '@/lib/types'
import { selectTodayTasks, upcomingDeadlines } from '@/lib/today'
import { cn } from '@/lib/utils'
import { SECTION, SECTION_TITLE, ROW } from './styles'
import { ScheduleCard } from './ScheduleCard'
import { useSchedule } from './useSchedule'
import { formatClock } from '@/lib/calendar/schedule'

interface TodayPageProps {
  onFocusTask: (taskId: string) => void
}

const CHECKBOX = 'h-5 w-5 shrink-0 accent-[var(--success)] cursor-pointer'
const OUTLINE_BUTTON = 'shrink-0 px-3.5 py-2.5 sm:py-2 text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TodayPage({ onFocusTask }: TodayPageProps) {
  const { tasks, moveTask, loading: tasksLoading } = useKanban()
  const { boards } = useBoards()
  const { getTodaysHabits, getCompletionStatus, getStreak, toggleHabit, completions, loading: habitsLoading } = useHabits()
  const todayKey = formatDateKey(new Date())
  const { getTodaysRoutines, getRoutineItems, isItemCompleted, toggleItem, getRoutineProgress } = useRoutines()
  const { getTodaysEntry } = useJournal()
  const { goals, milestones } = useGoals()
  const timer = useFocusTimer()
  const { setActiveView } = useNavigation()
  const { focusedTaskId } = useUIStateContext()
  const { getTodaysLocation } = useWorkLocation()

  const today = new Date()
  const boardNames = useMemo(() => new Map(boards.map(b => [b.id, b.name])), [boards])
  const { overdue, dueToday } = useMemo(() => selectTodayTasks(tasks, new Date()), [tasks])
  const taskCount = overdue.length + dueToday.length

  const habits = getTodaysHabits()
  const habitsDone = habits.filter(h => getCompletionStatus(h.id).isComplete).length

  const routines = getTodaysRoutines(getTodaysLocation())
  const entry = getTodaysEntry()
  const deadlines = useMemo(() => upcomingDeadlines(goals, milestones, new Date()), [goals, milestones])

  const focusedTask = focusedTaskId ? tasks.find(t => t.id === focusedTaskId) : undefined
  const nextTask: KanbanTask | undefined = focusedTask ?? overdue[0] ?? dueToday[0]
  const focusMinutes = timer.getTodaysFocusTime()
  const schedule = useSchedule()
  const showSchedule = schedule.configured || schedule.failed

  const summary = [
    `${taskCount} task${taskCount === 1 ? '' : 's'} due`,
    schedule.events.length > 0 ? `${schedule.remaining} event${schedule.remaining === 1 ? '' : 's'} left` : null,
    habits.length > 0 ? `${habitsDone} of ${habits.length} habits done` : null,
    ...routines.map(r => {
      const p = getRoutineProgress(r.id)
      return `${r.name} ${p.completed} of ${p.total}`
    }),
  ].filter(Boolean).join(' · ')

  const renderTask = (task: KanbanTask, isOverdue: boolean) => {
    const priority = PRIORITIES.find(p => p.id === task.priority)?.label ?? task.priority
    const subtasks = task.subtasks || []
    const doneSubtasks = subtasks.filter(s => s.completed).length
    const checkboxId = `today-task-${task.id}`
    return (
      <div key={task.id} className={ROW}>
        <input
          id={checkboxId}
          type="checkbox"
          className={CHECKBOX}
          onChange={() => moveTask(task.id, 'complete')}
          aria-label={`Mark ${task.title} complete`}
        />
        <div className="flex-1 min-w-0">
          <label htmlFor={checkboxId} className="block text-[15px] text-[var(--text-primary)] break-words cursor-pointer">
            {task.title}
          </label>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            {[
              task.boardId ? boardNames.get(task.boardId) : null,
              priority,
              subtasks.length > 0 ? `${doneSubtasks} of ${subtasks.length} subtasks` : null,
            ].filter(Boolean).join(' · ')}
            {' · '}
            <span className={cn(isOverdue && 'text-[var(--accent)] font-medium')}>
              {isOverdue ? `due ${formatDay(new Date(task.dueDate!))}` : 'due today'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFocusTask(task.id)}
          className={OUTLINE_BUTTON}
          aria-label={`Focus on ${task.title}`}
        >
          Focus
        </button>
      </div>
    )
  }

  const focusCard = (
    <section aria-labelledby="today-focus" className={cn(SECTION, 'py-5')}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="today-focus" className={SECTION_TITLE}>Focus</h2>
        <button type="button" onClick={() => setActiveView('focus')} className="text-[13px] text-[var(--accent)] hover:underline">
          Open timer
        </button>
      </div>
      <div className="mt-3 font-display text-[56px] sm:text-[64px] leading-none text-[var(--text-primary)] tabular-nums">
        {formatTime(timer.timeRemaining)}
      </div>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)] truncate">
        {timer.currentSessionType !== 'work'
          ? 'Break'
          : nextTask
            ? `${focusedTask ? 'Focusing on' : 'Next up'}: ${nextTask.title}`
            : 'Nothing due today'}
      </p>
      {schedule.freeUntil && timer.currentSessionType === 'work' && (
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Free until {formatClock(schedule.freeUntil)}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {!timer.isRunning && (
          <button
            type="button"
            onClick={() => (nextTask && !focusedTask && timer.currentSessionType === 'work' ? onFocusTask(nextTask.id) : timer.start())}
            className="px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            {nextTask && !focusedTask && timer.currentSessionType === 'work' ? 'Focus on next' : `Start ${Math.round(timer.timeRemaining / 60)} min`}
          </button>
        )}
        {timer.isRunning && !timer.isPaused && (
          <button type="button" onClick={timer.pause} className={OUTLINE_BUTTON}>Pause</button>
        )}
        {timer.isRunning && timer.isPaused && (
          <button type="button" onClick={timer.resume} className={OUTLINE_BUTTON}>Resume</button>
        )}
      </div>
      <p className="mt-4 text-[13px] text-[var(--text-secondary)]">
        {focusMinutes > 0 ? `${focusMinutes} min focused today` : 'No focus sessions yet today'}
      </p>
    </section>
  )

  const tasksCard = (
    <section aria-labelledby="today-tasks" className={cn(SECTION, 'pt-5 pb-2')}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="today-tasks" className={SECTION_TITLE}>Tasks</h2>
        <button type="button" onClick={() => setActiveView('board')} className="text-[13px] text-[var(--accent)] hover:underline">
          Open board
        </button>
      </div>
      {tasksLoading ? (
        <p className="py-4 text-[14px] text-[var(--text-secondary)]">Loading…</p>
      ) : taskCount === 0 ? (
        <p className="py-4 text-[14px] text-[var(--text-secondary)]">Nothing due today or in the last few days.</p>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 text-[13px] font-semibold text-[var(--accent)]">Overdue</h3>
              {overdue.map(t => renderTask(t, true))}
            </>
          )}
          {dueToday.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 text-[13px] font-semibold text-[var(--text-primary)]">Due today</h3>
              {dueToday.map(t => renderTask(t, false))}
            </>
          )}
        </>
      )}
    </section>
  )

  const habitsCard = (
    <section aria-labelledby="today-habits" className={cn(SECTION, 'pt-5 pb-2')}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 id="today-habits" className={SECTION_TITLE}>Habits</h2>
        {habits.length > 0 && (
          <span className="text-[13px] text-[var(--text-secondary)]">{habitsDone} of {habits.length}</span>
        )}
      </div>
      {habitsLoading ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">Loading…</p>
      ) : habits.length === 0 ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">No habits scheduled today.</p>
      ) : (
        habits.map(habit => {
          const { count, target, isComplete } = dayProgress(habit, completions, todayKey)
          const streak = getStreak(habit.id)?.currentStreak ?? 0
          const meta = [
            target > 1 ? `${Math.min(count, target)}/${target}` : null,
            streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : null,
          ].filter(Boolean).join(' · ')
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => toggleHabit(habit.id)}
              aria-label={habitActionLabel(habit.name, count, target)}
              className={cn(ROW, 'w-full text-left min-h-[48px] cursor-pointer')}
            >
              <HabitRing count={count} target={target} />
              <span className={cn('flex-1 text-[15px]', isComplete ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]')}>
                {habit.name}
              </span>
              {meta && (
                <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{meta}</span>
              )}
            </button>
          )
        })
      )}
    </section>
  )

  const routineCards = routines.map(routine => {
    const items = getRoutineItems(routine.id)
    const progress = getRoutineProgress(routine.id)
    const headingId = `today-routine-${routine.id}`
    return (
      <section key={routine.id} aria-labelledby={headingId} className={cn(SECTION, 'pt-5 pb-2')}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={headingId} className={SECTION_TITLE}>{routine.name}</h2>
          <span className="text-[13px] text-[var(--text-secondary)]">{progress.completed} of {progress.total}</span>
        </div>
        <div
          role="img"
          aria-label={`${progress.completed} of ${progress.total} steps done`}
          className="mt-3 mb-1.5 h-1 bg-[var(--border-subtle)]"
        >
          <div className="h-1 bg-[var(--success)] transition-all" style={{ width: `${progress.percentage}%` }} />
        </div>
        {items.map(item => {
          const done = isItemCompleted(item.id)
          const id = `today-routine-item-${item.id}`
          return (
            <div key={item.id} className={ROW}>
              <input id={id} type="checkbox" className={CHECKBOX} checked={done} onChange={() => toggleItem(item.id)} />
              <label htmlFor={id} className={cn('flex-1 text-[15px] cursor-pointer', done ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]')}>
                {item.title}
              </label>
            </div>
          )
        })}
      </section>
    )
  })

  const journalCard = (
    <section aria-labelledby="today-journal" className={cn(SECTION, 'py-5 flex items-center justify-between gap-4')}>
      <div>
        <h2 id="today-journal" className={cn(SECTION_TITLE, 'mb-1.5')}>Journal</h2>
        <p className="text-[15px] text-[var(--text-primary)]">
          {entry && entry.content.trim()
            ? `Written today · ${entry.wordCount} word${entry.wordCount === 1 ? '' : 's'}`
            : 'No entry yet today'}
        </p>
      </div>
      <button type="button" onClick={() => setActiveView('journal')} className={OUTLINE_BUTTON}>
        {entry && entry.content.trim() ? 'Open' : 'Write'}
      </button>
    </section>
  )

  const comingUpCard = (
    <section aria-labelledby="today-coming-up" className={cn(SECTION, 'pt-5 pb-2')}>
      <h2 id="today-coming-up" className={cn(SECTION_TITLE, 'mb-2')}>Coming up</h2>
      {deadlines.length === 0 ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">No goal deadlines in the next two weeks.</p>
      ) : (
        deadlines.map(d => (
          <button
            key={`${d.kind}-${d.id}`}
            type="button"
            onClick={() => setActiveView('goals')}
            className={cn(ROW, 'w-full justify-between text-left hover:bg-[var(--bg-tertiary)] transition-colors')}
          >
            <span className="text-[15px] text-[var(--text-primary)] min-w-0 break-words">{d.title}</span>
            <span className="shrink-0 text-[13px] text-[var(--text-secondary)]">
              {d.kind === 'goal' ? 'Goal' : 'Milestone'} · {formatDay(parseDateKey(d.date))}
            </span>
          </button>
        ))
      )}
    </section>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 mb-6 sm:mb-7">
          <div>
            <h1 className="font-display text-[40px] sm:text-[48px] leading-none tracking-tight text-[var(--text-primary)]">Today</h1>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <p className="hidden sm:block text-[14px] text-[var(--text-secondary)]">{summary}</p>
        </div>

        {/* Each card is rendered once. On a phone the two column wrappers use
            display: contents, so the cards form one column ordered by their
            order-* class (timer first). From lg up the wrappers become columns. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
          <div className="contents lg:flex lg:flex-[999_1_560px] lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="order-3 lg:order-none">{tasksCard}</div>
            {routineCards.length > 0 && (
              <div className="order-5 lg:order-none flex flex-col gap-4 lg:gap-6">{routineCards}</div>
            )}
          </div>
          <div className="contents lg:flex lg:flex-[1_1_340px] lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="order-1 lg:order-none">{focusCard}</div>
            {showSchedule && <div className="order-2 lg:order-none"><ScheduleCard schedule={schedule} /></div>}
            <div className="order-4 lg:order-none">{habitsCard}</div>
            <div className="order-6 lg:order-none">{journalCard}</div>
            <div className="order-7 lg:order-none">{comingUpCard}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
