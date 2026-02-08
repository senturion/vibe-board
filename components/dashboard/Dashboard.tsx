'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutGrid, Plus, Settings2, RotateCcw, Sparkles } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { DashboardWidget, WidgetType, WIDGET_TYPES } from '@/lib/types'
import { Widget } from './Widget'
import {
  FocusWidget,
  HabitsWidget,
  RoutinesWidget,
  GoalsWidget,
  StatsWidget,
  JournalWidget,
  TasksWidget,
  InsightsWidget,
} from './widgets'
import { DeadlinesWidget } from './widgets/DeadlinesWidget'
import { StreaksWidget } from './widgets/StreaksWidget'
import { ActivityFeedWidget } from './widgets/ActivityFeedWidget'
import { LoadingState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import {
  ListChecks,
  Target,
  Flag,
  BookOpen,
  Timer,
  BarChart3,
  Calendar,
  Cloud,
  CheckSquare,
  Clock,
  Flame,
  Activity,
} from 'lucide-react'

// Icon mapping for widget types
const WIDGET_ICONS: Record<string, React.ComponentType<{ size: number }>> = {
  ListChecks,
  Target,
  Flag,
  BookOpen,
  Timer,
  BarChart3,
  Calendar,
  Cloud,
  CheckSquare,
  Clock,
  Flame,
  Activity,
  Sparkles,
}

// Widget content map
const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType> = {
  focus: FocusWidget,
  habits: HabitsWidget,
  routines: RoutinesWidget,
  goals: GoalsWidget,
  stats: StatsWidget,
  journal: JournalWidget,
  tasks: TasksWidget,
  calendar: () => <div className="text-[11px] text-[var(--text-tertiary)] text-center">Calendar coming soon</div>,
  weather: () => <div className="text-[11px] text-[var(--text-tertiary)] text-center">Weather coming soon</div>,
  deadlines: DeadlinesWidget,
  streaks: StreaksWidget,
  activity: ActivityFeedWidget,
  insights: InsightsWidget,
}

function SortableWidget({
  widget,
  editMode,
  onRemove,
  onResize,
}: {
  widget: DashboardWidget
  editMode: boolean
  onRemove: () => void
  onResize: (size: { width: number; height: number }) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
  }

  const WidgetContent = WIDGET_COMPONENTS[widget.widgetType]

  return (
    <div ref={setNodeRef} style={style}>
      <Widget
        widget={widget}
        editMode={editMode}
        onRemove={onRemove}
        onResize={onResize}
        dragHandleProps={editMode ? { ...attributes, ...listeners } : undefined}
      >
        <WidgetContent />
      </Widget>
    </div>
  )
}

export function Dashboard() {
  const {
    visibleWidgets,
    loading,
    editMode,
    setEditMode,
    addWidget,
    removeWidget,
    updateWidget,
    updateLayout,
    resetLayout,
    availableWidgetTypes,
  } = useDashboard()

  const [showAddWidget, setShowAddWidget] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id)
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id)

      const newWidgets = arrayMove(visibleWidgets, oldIndex, newIndex).map((w, i) => ({
        ...w,
        positionY: Math.floor(i / 3),
        positionX: i % 3,
      }))

      updateLayout(newWidgets)
    }
  }

  if (loading) {
    return <LoadingState message="Loading dashboard..." />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <LayoutGrid size={20} className="text-[var(--accent)]" />
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          {editMode && (
            <>
              <button
                onClick={() => setShowAddWidget(!showAddWidget)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border transition-colors',
                  showAddWidget
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <Plus size={14} />
                Add Widget
              </button>
              <button
                onClick={resetLayout}
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)]"
                title="Reset to default"
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setEditMode(!editMode)
              setShowAddWidget(false)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border transition-colors',
              editMode
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]'
                : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
            )}
          >
            <Settings2 size={14} />
            {editMode ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddWidget && (
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-3">
            Add Widget
          </p>
          <div className="flex flex-wrap gap-2">
            {availableWidgetTypes.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                All widgets are already added
              </p>
            ) : (
              availableWidgetTypes.map(wt => {
                const Icon = WIDGET_ICONS[wt.icon] || LayoutGrid
                return (
                  <button
                    key={wt.id}
                    onClick={() => {
                      addWidget(wt.id)
                      setShowAddWidget(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <Icon size={14} />
                    <span className="text-[11px] text-[var(--text-secondary)]">{wt.title}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleWidgets.map(w => w.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gridAutoRows: '180px',
              }}
            >
              {visibleWidgets.map(widget => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  editMode={editMode}
                  onRemove={() => removeWidget(widget.id)}
                  onResize={(size) => updateWidget(widget.id, size)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {visibleWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <LayoutGrid size={48} className="text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No widgets yet</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
              Click &ldquo;Customize&rdquo; to add widgets to your dashboard
            </p>
            <button
              onClick={() => {
                setEditMode(true)
                setShowAddWidget(true)
              }}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-[11px] uppercase tracking-[0.1em]"
            >
              Add Widgets
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
