import { describe, it, expect } from 'vitest'
import { buildExport, EXPORT_TABLES } from '../exportData'

function fakeSupabase(rowsByTable: Record<string, unknown[]>, failing?: string) {
  return {
    from: (table: string) => ({
      select: () => ({
        range: async (from: number, to: number) => {
          if (table === failing) return { data: null, error: { message: 'boom' } }
          return { data: (rowsByTable[table] ?? []).slice(from, to + 1), error: null }
        },
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('buildExport', () => {
  it('includes every table, with counts', async () => {
    const file = await buildExport(fakeSupabase({ tasks: [{ id: 1 }, { id: 2 }], notes: [{ id: 'n' }] }))
    expect(Object.keys(file.data).sort()).toEqual([...EXPORT_TABLES].sort())
    expect(file.counts.tasks).toBe(2)
    expect(file.counts.notes).toBe(1)
    expect(file.counts.habits).toBe(0)
    expect(file.version).toBe('2.0')
  })

  it('reads past the 1000-row page limit', async () => {
    const tasks = Array.from({ length: 2500 }, (_, i) => ({ id: i }))
    const file = await buildExport(fakeSupabase({ tasks }))
    expect(file.data.tasks).toHaveLength(2500)
  })

  it('fails as a whole when a table cannot be read', async () => {
    await expect(buildExport(fakeSupabase({}, 'goals'))).rejects.toThrow(/goals: boom/)
  })
})
