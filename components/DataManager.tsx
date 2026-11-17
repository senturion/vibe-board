'use client'

import { useRef, useState } from 'react'
import { X, Download, FileJson, Check, AlertCircle, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildExport, type ExportFile } from '@/lib/exportData'
import { backupCounts, parseBackup, restoreBackup } from '@/lib/restoreData'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DataManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function DataManager({ isOpen, onClose }: DataManagerProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // A backup that has been read and checked, waiting for the user to confirm.
  const [pendingRestore, setPendingRestore] = useState<{ name: string; file: ExportFile } | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    e.target.value = ''
    if (!chosen) return
    setStatus('idle')
    try {
      const file = parseBackup(JSON.parse(await chosen.text()))
      if (backupCounts(file).length === 0) throw new Error('This backup is empty.')
      setPendingRestore({ name: chosen.name, file })
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof SyntaxError ? 'That file is not valid JSON.' : error instanceof Error ? error.message : 'Could not read the file.')
    }
  }

  const handleRestore = async () => {
    if (!pendingRestore || !user) return
    setRestoring('starting')
    setStatus('idle')
    try {
      const written = await restoreBackup(createClient(), pendingRestore.file, user.id, table =>
        setRestoring(table.replace(/_/g, ' ')),
      )
      const total = written.reduce((sum, t) => sum + t.rows, 0)
      setStatus('success')
      setMessage(`Restored ${total} records. Reloading…`)
      setPendingRestore(null)
      // Every section keeps its own copy of the data; a reload picks up the restored rows everywhere.
      setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Restore failed.')
    } finally {
      setRestoring(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setStatus('idle')
    try {
      const exportData = await buildExport(createClient())

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vibe-board-backup-${formatDateKey()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const total = Object.values(exportData.counts).reduce((sum, n) => sum + n, 0)
      setStatus('success')
      setMessage(`Exported ${exportData.counts.tasks} tasks and ${total - exportData.counts.tasks} other records.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl shadow-black/50 z-50 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">
              Data Management
            </p>
            <h2 className="font-display text-xl text-[var(--text-primary)] tracking-tight italic">
              Backup & Restore
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Message */}
          {status !== 'idle' && (
            <div
              className={cn(
                'flex items-center gap-3 p-4 border animate-fade-up',
                status === 'success' && 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]',
                status === 'error' && 'bg-red-500/10 border-red-500/30 text-red-400'
              )}
            >
              {status === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span className="text-[13px]">{message}</span>
            </div>
          )}

          {/* Export */}
          <div className="p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[var(--accent-glow)] text-[var(--accent)]">
                <Download size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-1">
                  Export Data
                </h3>
                <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
                  Download everything you have in Vibe Board (tasks, habits, goals, routines, journal, focus history and settings) as one JSON file.
                </p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="disabled:opacity-50 flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] transition-colors"
                >
                  <FileJson size={14} />
                  {exporting ? 'Exporting…' : 'Export Backup'}
                </button>
              </div>
            </div>
          </div>

          {/* Restore */}
          <div className="p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
                <Upload size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-1">
                  Restore from Backup
                </h3>
                {!pendingRestore ? (
                  <>
                    <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
                      Adds everything from a backup file back into your account. Items that still exist are replaced with the backup&apos;s version; nothing is deleted.
                    </p>
                    <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} className="hidden" aria-label="Choose a backup file" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!restoring}
                      className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
                    >
                      <Upload size={14} />
                      Choose Backup File
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-[var(--text-secondary)] mb-2 break-words">
                      {pendingRestore.name}, saved {new Date(pendingRestore.file.exportedAt).toLocaleString()}:
                    </p>
                    <ul className="text-[12px] text-[var(--text-secondary)] mb-4 grid grid-cols-2 gap-x-4">
                      {backupCounts(pendingRestore.file).map(({ table, rows }) => (
                        <li key={table}>{rows} {table.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleRestore}
                        disabled={!!restoring}
                        className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] disabled:opacity-50 transition-colors"
                      >
                        {restoring ? `Restoring ${restoring}…` : 'Restore'}
                      </button>
                      <button
                        onClick={() => setPendingRestore(null)}
                        disabled={!!restoring}
                        className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
