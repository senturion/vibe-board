'use client'

import { useRef, useState } from 'react'
import { X, Download, Upload, FileJson, Check, AlertCircle } from 'lucide-react'
import { KanbanTask, Board, TodoItem, Note } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ExportData {
  version: string
  exportedAt: string
  data: {
    tasks: KanbanTask[]
    boards: Board[]
    todos: TodoItem[]
    notes: Note
  }
}

interface DataManagerProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: ExportData['data']) => void
}

export function DataManager({ isOpen, onClose, onImport }: DataManagerProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      // Gather all data from localStorage
      const tasks = JSON.parse(localStorage.getItem('kanban-tasks') || '[]')
      const boards = JSON.parse(localStorage.getItem('kanban-boards') || '[]')
      const todos = JSON.parse(localStorage.getItem('todo-items') || '[]')
      const notes = JSON.parse(localStorage.getItem('notes') || '{"content":"","updatedAt":0}')

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          tasks,
          boards,
          todos,
          notes,
        },
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vibe-board-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('success')
      setMessage('Data exported successfully!')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 3000)
    } catch (error) {
      setStatus('error')
      setMessage('Failed to export data')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const importData: ExportData = JSON.parse(content)

        // Validate structure
        if (!importData.version || !importData.data) {
          throw new Error('Invalid backup file format')
        }

        // Check for required data fields
        if (!importData.data.tasks || !Array.isArray(importData.data.tasks)) {
          throw new Error('Invalid or missing tasks data')
        }

        // Import the data
        if (importData.data.tasks) {
          localStorage.setItem('kanban-tasks', JSON.stringify(importData.data.tasks))
        }
        if (importData.data.boards) {
          localStorage.setItem('kanban-boards', JSON.stringify(importData.data.boards))
        }
        if (importData.data.todos) {
          localStorage.setItem('todo-items', JSON.stringify(importData.data.todos))
        }
        if (importData.data.notes) {
          localStorage.setItem('notes', JSON.stringify(importData.data.notes))
        }

        onImport(importData.data)

        setStatus('success')
        setMessage(`Imported ${importData.data.tasks.length} tasks from ${new Date(importData.exportedAt).toLocaleDateString()}`)

        // Reload to apply changes
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Failed to import data')
      }
    }
    reader.readAsText(file)

    // Reset input
    e.target.value = ''
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
                  Download all your boards, tasks, todos, and notes as a JSON file.
                </p>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] transition-colors"
                >
                  <FileJson size={14} />
                  Export Backup
                </button>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className="p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
                <Upload size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-1">
                  Import Data
                </h3>
                <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
                  Restore from a previously exported backup file. This will replace all current data.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Upload size={14} />
                  Choose File
                </button>
              </div>
            </div>
          </div>

          {/* Warning */}
          <p className="text-[11px] text-[var(--text-tertiary)] text-center">
            Importing will overwrite all existing data. Make sure to export first.
          </p>
        </div>
      </div>
    </>
  )
}
