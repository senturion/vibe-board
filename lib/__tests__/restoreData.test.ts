import { describe, it, expect } from 'vitest'
import { parseBackup, restoreBackup, RESTORE_ORDER, BackupFormatError } from '../restoreData'
import { EXPORT_TABLES } from '../exportData'

function fakeSupabase(failOn?: string) {
  const calls: { table: string; rows: Record<string, unknown>[]; onConflict: string }[] = []
  return {
    calls,
    client: {
      from: (table: string) => ({
        upsert: async (rows: Record<string, unknown>[], opts: { onConflict: string }) => {
          calls.push({ table, rows, onConflict: opts.onConflict })
          return { error: table === failOn ? { message: 'boom' } : null }
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  }
}

const file = (data: Record<string, unknown[]>) => ({ version: '2.0', exportedAt: '', counts: {}, data })

describe('parseBackup', () => {
  it('rejects files that are not a current backup', () => {
    expect(() => parseBackup(null)).toThrow(BackupFormatError)
    expect(() => parseBackup({ version: '1.0', data: {} })).toThrow(/older version/)
    expect(() => parseBackup({ version: '2.0', data: { tasks: 'x' } })).toThrow(/damaged/)
    expect(parseBackup(file({ tasks: [] })).version).toBe('2.0')
  })
})

describe('restoreBackup', () => {
  it('covers every exported table', () => {
    expect([...RESTORE_ORDER].sort()).toEqual([...EXPORT_TABLES].sort())
  })

  it('writes parents before children and assigns every row to the signed-in user', async () => {
    const { client, calls } = fakeSupabase()
    await restoreBackup(
      client,
      parseBackup(file({
        tasks: [{ id: 't1', board_id: 'b1', user_id: 'someone-else' }],
        boards: [{ id: 'b1', user_id: 'someone-else' }],
        task_tags: [{ task_id: 't1', tag_id: 'g1' }],
      })),
      'me',
    )
    expect(calls.map(c => c.table)).toEqual(['boards', 'tasks', 'task_tags'])
    expect(calls[0].rows[0].user_id).toBe('me')
    expect(calls[1].rows[0].user_id).toBe('me')
    expect('user_id' in calls[2].rows[0]).toBe(false)
    expect(calls[2].onConflict).toBe('task_id,tag_id')
  })

  it('matches one-per-day rows on their natural key, keeping the existing id', async () => {
    const { client, calls } = fakeSupabase()
    await restoreBackup(client, parseBackup(file({ journal_entries: [{ id: 'j1', entry_date: '2026-11-17' }] })), 'me')
    expect(calls[0].onConflict).toBe('user_id,entry_date')
    expect('id' in calls[0].rows[0]).toBe(false)
  })

  it('stops at the first failing table and names it', async () => {
    const { client, calls } = fakeSupabase('tasks')
    await expect(
      restoreBackup(client, parseBackup(file({ boards: [{ id: 'b' }], tasks: [{ id: 't' }], todos: [{ id: 'd' }] })), 'me'),
    ).rejects.toThrow(/Restore stopped at tasks/)
    expect(calls.map(c => c.table)).toEqual(['boards', 'tasks'])
  })

  it('writes large tables in batches', async () => {
    const { client, calls } = fakeSupabase()
    const habits = Array.from({ length: 1200 }, (_, i) => ({ id: `h${i}` }))
    await restoreBackup(client, parseBackup(file({ habits })), 'me')
    expect(calls.map(c => c.rows.length)).toEqual([500, 500, 200])
  })
})
