'use client'

import type { Schedule } from './useSchedule'
import { eventTiming, formatClock, formatDuration } from '@/lib/calendar/schedule'
import { cn } from '@/lib/utils'
import { SECTION, SECTION_TITLE } from './styles'

const TIME = 'w-[72px] shrink-0 text-[13px] tabular-nums'
const ROW = 'flex items-start gap-2.5 py-3 border-t border-[var(--border-subtle)]'

export function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const { now, events, calendars, remaining, loading, failed, errors } = schedule

  return (
    <section aria-labelledby="today-schedule" className={cn(SECTION, 'pt-5 pb-2')}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 id="today-schedule" className={SECTION_TITLE}>Schedule</h2>
        {events.length > 0 && (
          <span className="text-[13px] text-[var(--text-secondary)]">
            {remaining === 0 ? 'Nothing left today' : `${remaining} left today`}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">Loading…</p>
      ) : failed ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">Could not load your calendars. It will try again shortly.</p>
      ) : events.length === 0 ? (
        <p className="py-3 text-[14px] text-[var(--text-secondary)]">Nothing scheduled today.</p>
      ) : (
        <ul>
          {events.map(event => {
            const timing = eventTiming(event, now)
            const calendar = calendars.get(event.calendarId)
            const past = timing === 'past'
            const live = timing === 'now'
            const detail = [
              calendar?.name,
              live ? null : event.location ?? (event.allDay ? null : formatDuration(event)),
            ].filter(Boolean).join(' · ')
            return (
              <li key={event.id} className={ROW}>
                <span
                  className={cn(
                    TIME,
                    'pt-px',
                    live ? 'font-semibold text-[var(--accent)]' : past ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {event.allDay ? 'All day' : formatClock(event.start)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', past && 'opacity-50')}
                  style={{ backgroundColor: calendar?.color ?? 'var(--text-tertiary)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[15px] break-words', past ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]')}>
                    {event.title}
                  </p>
                  {live ? (
                    <p className="mt-0.5 text-[13px] text-[var(--accent)]">Now · until {formatClock(event.end)}</p>
                  ) : detail ? (
                    <p className={cn('mt-0.5 text-[13px] truncate', past ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]')}>
                      {detail}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {errors.length > 0 && (
        <p className="py-3 border-t border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)]">
          {errors.join(' ')}
        </p>
      )}
    </section>
  )
}
