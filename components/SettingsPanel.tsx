'use client'

import { useState } from 'react'
import { X, Moon, Sun, LayoutList, LayoutGrid, RotateCcw } from 'lucide-react'
import { ColumnId, COLUMNS } from '@/lib/types'
import { COLOR_PALETTE } from '@/hooks/useColumnColors'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  // Theme
  isDark: boolean
  onToggleTheme: () => void
  // Compact mode
  compact: boolean
  onToggleCompact: () => void
  // Column colors
  columnColors: Record<ColumnId, string>
  onColumnColorChange: (columnId: ColumnId, color: string) => void
  onResetColors: () => void
}

export function SettingsPanel({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
  compact,
  onToggleCompact,
  columnColors,
  onColumnColorChange,
  onResetColors,
}: SettingsPanelProps) {
  const [expandedColumn, setExpandedColumn] = useState<ColumnId | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[340px] bg-[var(--bg-primary)] border-l border-[var(--border)] z-50 animate-slide-left overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-display text-lg text-[var(--text-primary)] italic">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme Section */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
              Theme
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => isDark && onToggleTheme()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 border transition-colors',
                  !isDark
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <Sun size={14} />
                <span className="text-[11px] uppercase tracking-[0.1em]">Light</span>
              </button>
              <button
                onClick={() => !isDark && onToggleTheme()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 border transition-colors',
                  isDark
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <Moon size={14} />
                <span className="text-[11px] uppercase tracking-[0.1em]">Dark</span>
              </button>
            </div>
          </section>

          {/* View Section */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
              Card View
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => compact && onToggleCompact()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 border transition-colors',
                  !compact
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <LayoutGrid size={14} />
                <span className="text-[11px] uppercase tracking-[0.1em]">Full</span>
              </button>
              <button
                onClick={() => !compact && onToggleCompact()}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 border transition-colors',
                  compact
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <LayoutList size={14} />
                <span className="text-[11px] uppercase tracking-[0.1em]">Compact</span>
              </button>
            </div>
          </section>

          {/* Column Colors Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                Column Colors
              </h3>
              <button
                onClick={onResetColors}
                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </div>
            <div className="space-y-1">
              {COLUMNS.map(column => (
                <div key={column.id} className="relative">
                  <button
                    onClick={() => setExpandedColumn(expandedColumn === column.id ? null : column.id)}
                    className={cn(
                      'w-full flex items-center justify-between py-2 px-2 -mx-2 rounded transition-colors',
                      expandedColumn === column.id
                        ? 'bg-[var(--bg-tertiary)]'
                        : 'hover:bg-[var(--bg-secondary)]'
                    )}
                  >
                    <span className="text-[12px] text-[var(--text-secondary)]">{column.title}</span>
                    <div
                      className="w-6 h-4 rounded-sm border border-white/20"
                      style={{ backgroundColor: columnColors[column.id] }}
                    />
                  </button>

                  {expandedColumn === column.id && (
                    <div className="flex flex-wrap gap-1.5 py-2 px-1">
                      {COLOR_PALETTE.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            onColumnColorChange(column.id, color)
                            setExpandedColumn(null)
                          }}
                          className={cn(
                            'w-6 h-6 rounded-sm transition-all hover:scale-110',
                            columnColors[column.id] === color && 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-primary)]'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
