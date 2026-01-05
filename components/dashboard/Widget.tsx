'use client'

import { ReactNode } from 'react'
import { X, GripVertical, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react'
import { DashboardWidget, WIDGET_TYPES } from '@/lib/types'
import { useUIStateContext } from '@/contexts/UIStateContext'
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
  const { isWidgetCollapsed, toggleWidgetCollapsed } = useUIStateContext()
  const widgetInfo = WIDGET_TYPES.find(w => w.id === widget.widgetType)
  const title = widget.title || widgetInfo?.title || 'Widget'

  const canExpand = widget.width < 3
  const canShrink = widget.width > 1
  const isCollapsed = isWidgetCollapsed(widget.id)

  return (
    <div
      className={cn(
        'relative bg-[var(--bg-secondary)] border border-[var(--border)] transition-all',
        editMode && 'ring-2 ring-[var(--accent)]/20',
        isCollapsed && 'self-start'
      )}
      style={{
        gridColumn: `span ${widget.width}`,
        gridRow: isCollapsed ? 'span 1' : `span ${widget.height}`,
      }}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          !isCollapsed && 'border-b border-[var(--border-subtle)]'
        )}
      >
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

        <div className="flex items-center gap-1">
          {/* Collapse toggle - always visible */}
          <button
            onClick={() => toggleWidgetCollapsed(widget.id)}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>

          {/* Edit mode controls */}
          {editMode && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 overflow-auto" style={{ maxHeight: 'calc(100% - 36px)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
