'use client'

import { Archive, X, RotateCcw, Trash2 } from 'lucide-react'
import { KanbanTask } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ArchivePanelProps {
  isOpen: boolean
  onClose: () => void
  archivedTasks: KanbanTask[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function ArchivePanel({ isOpen, onClose, archivedTasks, onRestore, onDelete }: ArchivePanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl shadow-black/30 z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Archive size={18} className="text-[var(--text-tertiary)]" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-0.5">
                Archived
              </p>
              <span className="font-display text-lg text-[var(--text-primary)] italic">
                {archivedTasks.length} {archivedTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {archivedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Archive size={32} className="text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-tertiary)] italic">No archived tasks</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                Completed tasks can be archived to keep your board clean
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedTasks.map((task) => (
                <div
                  key={task.id}
                  className="group bg-[var(--bg-tertiary)] border-l-2 border-[var(--border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                      {task.title}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      Archived {task.archivedAt && new Date(task.archivedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onRestore(task.id)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--success)] hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-red-400 hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
