'use client'

import { useState } from 'react'
import { Kanban, LayoutGrid, LayoutList, Tag } from 'lucide-react'
import { ColumnId, COLUMNS } from '@/lib/types'
import { COLOR_PALETTE } from '@/hooks/useColumnColors'
import { AppSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import { TagManager } from '@/components/tags'
import { SectionHeader, Toggle, NumberInput, SettingsSection } from './shared'

interface BoardSectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  compact: boolean
  onToggleCompact: () => void
  columnColors: Record<ColumnId, string>
  onColumnColorChange: (columnId: ColumnId, color: string) => void
  onResetColors: () => void
}

export function BoardSection({
  expanded, onToggle, settings, updateSetting,
  compact, onToggleCompact, columnColors, onColumnColorChange, onResetColors,
}: BoardSectionProps) {
  const [expandedColumn, setExpandedColumn] = useState<ColumnId | null>(null)
  const [showTagManager, setShowTagManager] = useState(false)

  return (
    <>
      <div className="border-b border-[var(--border-subtle)]">
        <SectionHeader section="board" icon={Kanban} title="Board" expanded={expanded} onToggle={onToggle} />
        {expanded && (
          <div className="pb-4 space-y-3">
            {/* Card View */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Card View</p>
              <div className="flex gap-2">
                <button
                  onClick={() => compact && onToggleCompact()}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                    !compact
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  <LayoutGrid size={14} />
                  <span className="text-[10px] uppercase tracking-[0.1em]">Full</span>
                </button>
                <button
                  onClick={() => !compact && onToggleCompact()}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                    compact
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  <LayoutList size={14} />
                  <span className="text-[10px] uppercase tracking-[0.1em]">Compact</span>
                </button>
              </div>
            </div>

            <Toggle checked={settings.showArchivedTasks} onChange={(val) => updateSetting('showArchivedTasks', val)} label="Show archived tasks" />
            <Toggle checked={settings.autoArchiveCompleted} onChange={(val) => updateSetting('autoArchiveCompleted', val)} label="Auto-archive completed tasks" />
            <Toggle checked={settings.expandSubtasksByDefault} onChange={(val) => updateSetting('expandSubtasksByDefault', val)} label="Expand subtasks on cards by default" />

            {settings.autoArchiveCompleted && (
              <NumberInput value={settings.archiveAfterDays} onChange={(val) => updateSetting('archiveAfterDays', val)} label="Archive after" min={1} max={30} suffix="days" />
            )}

            {/* Column Colors */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Column Colors</p>
                <button onClick={onResetColors} className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Reset</button>
              </div>
              <div className="space-y-1">
                {COLUMNS.map(column => (
                  <div key={column.id} className="relative">
                    <button
                      onClick={() => setExpandedColumn(expandedColumn === column.id ? null : column.id)}
                      className={cn(
                        'w-full flex items-center justify-between py-1.5 px-2 -mx-2 transition-colors',
                        expandedColumn === column.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
                      )}
                    >
                      <span className="text-[11px] text-[var(--text-secondary)]">{column.title}</span>
                      <div className="w-5 h-3 rounded-sm border border-white/20" style={{ backgroundColor: columnColors[column.id] }} />
                    </button>
                    {expandedColumn === column.id && (
                      <div className="flex flex-wrap gap-1 py-2 px-1">
                        {COLOR_PALETTE.map(color => (
                          <button
                            key={color}
                            onClick={() => { onColumnColorChange(column.id, color); setExpandedColumn(null) }}
                            className={cn('w-5 h-5 rounded-sm transition-all hover:scale-110', columnColors[column.id] === color && 'ring-2 ring-[var(--accent)]')}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowTagManager(true)} className="flex items-center gap-2 text-[11px] text-[var(--accent)] hover:opacity-80 pt-1">
              <Tag size={12} /> Manage tags
            </button>
          </div>
        )}
      </div>
      <TagManager isOpen={showTagManager} onClose={() => setShowTagManager(false)} />
    </>
  )
}
