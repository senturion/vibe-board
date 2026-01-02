'use client'

import { ReactNode } from 'react'
import { X, GripVertical, Maximize2, Minimize2 } from 'lucide-react'
import { DashboardWidget, WIDGET_TYPES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface WidgetProps {
  widget: DashboardWidget
  children: ReactNode
  editMode?: boolean
  onRemove?: () => void
  onResize?: (size: { width: number; height: number }) => void
  dragHandleProps?: Record<string, unknown>
}

export function Widget({
  widget,
  children,
  editMode,
  onRemove,
  onResize,
  dragHandleProps,
}: WidgetProps) {
  const widgetInfo = WIDGET_TYPES.find(w => w.id === widget.widgetType)
  const title = widget.title || widgetInfo?.title || 'Widget'

  const canExpand = widget.width < 3
  const canShrink = widget.width > 1

  return (
    <div
      className={cn(
        'relative bg-[var(--bg-secondary)] border border-[var(--border)] transition-all',
        editMode && 'ring-2 ring-[var(--accent)]/20'
      )}
      style={{
        gridColumn: `span ${widget.width}`,
        gridRow: `span ${widget.height}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              {...dragHandleProps}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={14} />
            </button>
          )}
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium">
            {title}
          </h3>
        </div>

        {editMode && (
          <div className="flex items-center gap-1">
            {canShrink && onResize && (
              <button
                onClick={() => onResize({ width: widget.width - 1, height: widget.height })}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                title="Shrink"
              >
                <Minimize2 size={12} />
              </button>
            )}
            {canExpand && onResize && (
              <button
                onClick={() => onResize({ width: widget.width + 1, height: widget.height })}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                title="Expand"
              >
                <Maximize2 size={12} />
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 text-[var(--text-tertiary)] hover:text-red-400"
                title="Remove widget"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 overflow-auto" style={{ maxHeight: 'calc(100% - 36px)' }}>
        {children}
      </div>
    </div>
  )
}
