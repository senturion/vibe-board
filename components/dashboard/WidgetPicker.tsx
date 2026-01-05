'use client'

import { X, Plus } from 'lucide-react'
import { WidgetType, WIDGET_TYPES } from '@/lib/types'
import * as Icons from 'lucide-react'

interface WidgetPickerProps {
  isOpen: boolean
  onClose: () => void
  onAddWidget: (type: WidgetType) => void
  existingWidgets: WidgetType[]
}

export function WidgetPicker({
  isOpen,
  onClose,
  onAddWidget,
  existingWidgets,
}: WidgetPickerProps) {
  if (!isOpen) return null

  // Get available widgets (not already added)
  const availableWidgets = WIDGET_TYPES.filter(
    wt => !existingWidgets.includes(wt.id)
  )

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size: number; className?: string }>>)[iconName]
    return IconComponent || Icons.LayoutGrid
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] bg-[var(--bg-primary)] rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {availableWidgets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-tertiary)]">
                All widgets have been added to your dashboard
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableWidgets.map(widget => {
                const Icon = getIcon(widget.icon)

                return (
                  <button
                    key={widget.id}
                    onClick={() => {
                      onAddWidget(widget.id)
                      onClose()
                    }}
                    className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                      <Icon size={20} className="text-[var(--accent)]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {widget.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {widget.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <span>{widget.defaultSize.width}×{widget.defaultSize.height}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
