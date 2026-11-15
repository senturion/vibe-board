'use client'

import { useState } from 'react'
import { X, Download, FileJson, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildExport } from '@/lib/exportData'
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
              Backup
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

          <p className="text-[11px] text-[var(--text-tertiary)] text-center">
            Restoring from a backup is not available in the app yet.
          </p>
        </div>
      </div>
    </>
  )
}
