import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  listHabits,
  getHabitStatus,
  listHabitHistory,
  logHabitCompletion,
  createHabit,
} from '../../tools/habits'

const OWNER = '00000000-0000-0000-0000-000000000001'

type Call = { table: string; method: string; args: unknown[] }

// Stateful fake: each table chain resolves to its rowsByTable list, but mutations
// on `habits` and `habit_completions` push the inserted/updated value as the
// "last row" used by .single().
function fakeClient(rowsByTable: Record<string, unknown[]>) {
  const calls: Call[] = []
  // Tracks last inserted/updated row per table so .select().single() after a
  // mutation returns it (Supabase semantics).
  const lastMutated: Record<string, Record<string, unknown> | null> = {}

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {}
    let pendingValues: Record<string, unknown> | null = null

    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }

    chain.select = (...a: unknown[]) => record('select', ...a)
    chain.insert = (...a: unknown[]) => {
      pendingValues = a[0] as Record<string, unknown>
      return record('insert', ...a)
    }
    chain.update = (...a: unknown[]) => {
      pendingValues = a[0] as Record<string, unknown>
      return record('update', ...a)
    }
    chain.eq = (...a: unknown[]) => record('eq', ...a)
    chain.is = (...a: unknown[]) => record('is', ...a)
    chain.in = (...a: unknown[]) => record('in', ...a)
    chain.contains = (...a: unknown[]) => record('contains', ...a)
    chain.gte = (...a: unknown[]) => record('gte', ...a)
    chain.lte = (...a: unknown[]) => record('lte', ...a)
    chain.order = (...a: unknown[]) => record('order', ...a)
    chain.limit = (...a: unknown[]) => record('limit', ...a)

    const applyPending = () => {
      if (pendingValues) {
        lastMutated[table] = { ...pendingValues }
        pendingValues = null
      }
    }

    chain.maybeSingle = () => {
      applyPending()
      const row =
        lastMutated[table] ?? rowsByTable[table]?.[0] ?? null
      return Promise.resolve({ data: row, error: null })
    }
    chain.single = () => {
      applyPending()
      const row =
        lastMutated[table] ?? rowsByTable[table]?.[0] ?? null
      return Promise.resolve({ data: row, error: null })
    }
    chain.then = (resolve: (v: unknown) => unknown) => {
      applyPending()
      return Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(
        resolve,
      )
    }
    return chain
  }
  return { client: { from: builder }, calls }
}

const deps = (rowsByTable: Record<string, unknown[]>) => {
  const fake = fakeClient(rowsByTable)
  return {
    deps: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getClient: () => fake.client as any,
      ownerId: () => OWNER,
    },
    calls: fake.calls,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('listHabits', () => {
  it('default: scopes by user_id, filters active+unarchived, orders by "order", merges streak + category', async () => {
    const habits = [
      {
        id: 'h1',
        user_id: OWNER,
        name: 'Drink water',
        category_id: 'c1',
        is_active: true,
        archived_at: null,
        order: 0,
      },
      {
        id: 'h2',
        user_id: OWNER,
        name: 'Read',
        category_id: null,
        is_active: true,
        archived_at: null,
        order: 1,
      },
    ]
    const streaks = [
      { habit_id: 'h1', current_streak: 3, best_streak: 10 },
      { habit_id: 'h2', current_streak: 0, best_streak: 5 },
    ]
    const categories = [{ id: 'c1', name: 'Health', color: '#abcdef' }]

    const { deps: d, calls } = deps({
      habits,
      habit_streaks: streaks,
      habit_categories: categories,
    })

    const result = await listHabits({}, d)

    const habitsCalls = calls.filter((c) => c.table === 'habits')
    expect(habitsCalls[0]).toMatchObject({ table: 'habits', method: 'select' })

    const eqArgs = habitsCalls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['user_id', OWNER],
        ['is_active', true],
      ]),
    )
    const isCall = habitsCalls.find((c) => c.method === 'is')
    expect(isCall?.args).toEqual(['archived_at', null])

    const orderCall = habitsCalls.find((c) => c.method === 'order')
    expect(orderCall?.args[0]).toBe('order')

    const parsed = JSON.parse(result.content[0].text) as Array<
      Record<string, unknown>
    >
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toMatchObject({
      id: 'h1',
      current_streak: 3,
      best_streak: 10,
      category_name: 'Health',
      category_color: '#abcdef',
    })
    expect(parsed[1]).toMatchObject({
      id: 'h2',
      current_streak: 0,
      best_streak: 5,
      category_name: null,
      category_color: null,
    })
  })

  it('include_archived: true does NOT add is_active or archived_at filters', async () => {
    const { deps: d, calls } = deps({
      habits: [],
      habit_streaks: [],
      habit_categories: [],
    })
    await listHabits({ include_archived: true }, d)

    const habitsCalls = calls.filter((c) => c.table === 'habits')
    const eqArgs = habitsCalls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual([['user_id', OWNER]])
    expect(habitsCalls.find((c) => c.method === 'is')).toBeUndefined()
  })
})

describe('getHabitStatus', () => {
  it('includes daily + matching specific_days; excludes specific_days that do not match', async () => {
    // 2026-04-30 is a Thursday → DayOfWeek 4 (1=Mon..7=Sun)
    const habits = [
      {
        id: 'h-daily',
        user_id: OWNER,
        name: 'Daily one',
        frequency_type: 'daily',
        specific_days: null,
        target_count: 1,
        is_active: true,
        archived_at: null,
      },
      {
        id: 'h-thu',
        user_id: OWNER,
        name: 'Thursdays',
        frequency_type: 'specific_days',
        specific_days: [4],
        target_count: 2,
        is_active: true,
        archived_at: null,
      },
      {
        id: 'h-mon',
        user_id: OWNER,
        name: 'Mondays only',
        frequency_type: 'specific_days',
        specific_days: [1],
        target_count: 1,
        is_active: true,
        archived_at: null,
      },
    ]
    const completions = [
      { habit_id: 'h-daily', count: 1 },
      { habit_id: 'h-thu', count: 1 }, // partial — done = false
    ]

    const { deps: d } = deps({
      habits,
      habit_completions: completions,
    })

    const result = await getHabitStatus({ date: '2026-04-30' }, d)
    const parsed = JSON.parse(result.content[0].text) as Array<
      Record<string, unknown>
    >

    const ids = parsed.map((p) => p.habit_id)
    expect(ids).toContain('h-daily')
    expect(ids).toContain('h-thu')
    expect(ids).not.toContain('h-mon')
  })

  it('computes done correctly from summed count vs target_count', async () => {
    // Two completions of count 2 each → 4 total. target_count = 3 → done=true.
    const habits = [
      {
        id: 'h-multi',
        user_id: OWNER,
        name: 'Multi',
        frequency_type: 'daily',
        specific_days: null,
        target_count: 3,
        is_active: true,
        archived_at: null,
      },
      {
        id: 'h-not-yet',
        user_id: OWNER,
        name: 'Not yet',
        frequency_type: 'daily',
        specific_days: null,
        target_count: 5,
        is_active: true,
        archived_at: null,
      },
    ]
    const completions = [
      { habit_id: 'h-multi', count: 2 },
      { habit_id: 'h-multi', count: 2 },
      { habit_id: 'h-not-yet', count: 1 },
    ]

    const { deps: d } = deps({
      habits,
      habit_completions: completions,
    })

    const result = await getHabitStatus({ date: '2026-04-30' }, d)
    const parsed = JSON.parse(result.content[0].text) as Array<{
      habit_id: string
      completions_today: number
      done: boolean
      target_count: number
    }>

    const multi = parsed.find((p) => p.habit_id === 'h-multi')!
    const notYet = parsed.find((p) => p.habit_id === 'h-not-yet')!
    expect(multi.completions_today).toBe(4)
    expect(multi.done).toBe(true)
    expect(notYet.completions_today).toBe(1)
    expect(notYet.done).toBe(false)
  })
})

describe('listHabitHistory', () => {
  it('filters by habit_id + date range, scoped by user_id, ordered ascending', async () => {
    const completions = [
      {
        id: 'c1',
        user_id: OWNER,
        habit_id: 'h1',
        completion_date: '2026-04-28',
        count: 1,
      },
      {
        id: 'c2',
        user_id: OWNER,
        habit_id: 'h1',
        completion_date: '2026-04-29',
        count: 1,
      },
    ]
    const { deps: d, calls } = deps({ habit_completions: completions })

    const result = await listHabitHistory(
      { habit_id: 'h1', from: '2026-04-01', to: '2026-04-30' },
      d,
    )

    const cCalls = calls.filter((c) => c.table === 'habit_completions')
    const eqArgs = cCalls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['user_id', OWNER],
        ['habit_id', 'h1'],
      ]),
    )
    const gte = cCalls.find((c) => c.method === 'gte')
    const lte = cCalls.find((c) => c.method === 'lte')
    expect(gte?.args).toEqual(['completion_date', '2026-04-01'])
    expect(lte?.args).toEqual(['completion_date', '2026-04-30'])

    const order = cCalls.find((c) => c.method === 'order')
    expect(order?.args[0]).toBe('completion_date')

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(completions) }],
    })
  })
})

describe('logHabitCompletion', () => {
  it('inserts with defaults: today UTC date and count=1', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-30T12:34:56Z'))

    const inserted = {
      id: 'comp1',
      user_id: OWNER,
      habit_id: 'h1',
      completion_date: '2026-04-30',
      count: 1,
      note: undefined,
    }
    const { deps: d, calls } = deps({ habit_completions: [inserted] })

    const result = await logHabitCompletion({ habit_id: 'h1' }, d)

    const insertCall = calls.find(
      (c) => c.table === 'habit_completions' && c.method === 'insert',
    )
    expect(insertCall).toBeDefined()
    const payload = insertCall?.args[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      user_id: OWNER,
      habit_id: 'h1',
      completion_date: '2026-04-30',
      count: 1,
    })

    // MUST NOT touch habit_streaks
    expect(calls.find((c) => c.table === 'habit_streaks')).toBeUndefined()

    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>
    expect(parsed).toMatchObject({ habit_id: 'h1', count: 1 })
  })
})

describe('createHabit', () => {
  it('inserts with defaults: daily, target_count=1, habit_type=build, is_active=true', async () => {
    const { deps: d, calls } = deps({ habits: [] })

    const result = await createHabit({ name: 'Stretch' }, d)

    const insertCall = calls.find(
      (c) => c.table === 'habits' && c.method === 'insert',
    )
    expect(insertCall).toBeDefined()
    const payload = insertCall?.args[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      user_id: OWNER,
      name: 'Stretch',
      frequency_type: 'daily',
      frequency_value: 1,
      target_count: 1,
      habit_type: 'build',
      is_active: true,
    })

    // The insert payload is what flows through to .single() in our fake.
    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>
    expect(parsed).toMatchObject({
      user_id: OWNER,
      name: 'Stretch',
      frequency_type: 'daily',
      target_count: 1,
      habit_type: 'build',
      is_active: true,
    })
  })
})
