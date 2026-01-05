'use client'

import { useState, useEffect } from 'react'
import { PanelRightClose, PanelRight, ChevronDown, ChevronUp, Settings2, X, Plus, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { TodoList } from './TodoList'
import { Notes } from './Notes'
import {
  QuoteWidget,
  WeatherWidget,
  HabitsMiniWidget,
  FocusMiniWidget,
  GoalsMiniWidget,
  WorkLocationWidget,
  DeadlinesMiniWidget,
  StreaksMiniWidget,
  ActivityMiniWidget,
} from './widgets'
import { cn } from '@/lib/utils'

// Define all available sidebar widgets
type SidebarWidgetId = 'weather' | 'quote' | 'workLocation' | 'focus' | 'habits' | 'goals' | 'tasks' | 'notes' | 'deadlines' | 'streaks' | 'activity'

interface SidebarWidgetConfig {
  id: SidebarWidgetId
  title: string
  component: React.ComponentType
  defaultVisible: boolean
  defaultOrder: number
}

const SIDEBAR_WIDGETS: SidebarWidgetConfig[] = [
  { id: 'weather', title: 'Weather', component: WeatherWidget, defaultVisible: true, defaultOrder: 0 },
  { id: 'quote', title: 'Daily Quote', component: QuoteWidget, defaultVisible: true, defaultOrder: 1 },
  { id: 'workLocation', title: 'Work Location', component: WorkLocationWidget, defaultVisible: true, defaultOrder: 2 },
  { id: 'focus', title: 'Focus Timer', component: FocusMiniWidget, defaultVisible: true, defaultOrder: 3 },
  { id: 'habits', title: "Today's Habits", component: HabitsMiniWidget, defaultVisible: true, defaultOrder: 4 },
  { id: 'goals', title: 'Goals', component: GoalsMiniWidget, defaultVisible: true, defaultOrder: 5 },
  { id: 'deadlines', title: 'Upcoming Deadlines', component: DeadlinesMiniWidget, defaultVisible: false, defaultOrder: 6 },
  { id: 'streaks', title: 'Habit Streaks', component: StreaksMiniWidget, defaultVisible: false, defaultOrder: 7 },
  { id: 'activity', title: 'Recent Activity', component: ActivityMiniWidget, defaultVisible: false, defaultOrder: 8 },
  { id: 'tasks', title: 'Quick Tasks', component: () => <div className="max-h-[200px] overflow-y-auto"><TodoList compact /></div>, defaultVisible: true, defaultOrder: 9 },
  { id: 'notes', title: 'Quick Notes', component: () => <div className="max-h-[250px] overflow-y-auto"><Notes compact /></div>, defaultVisible: false, defaultOrder: 10 },
]

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  onRemove?: () => void
  editMode?: boolean
}

function CollapsibleSection({ title, defaultOpen = true, children, onRemove, editMode }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {editMode && (
            <GripVertical size={12} className="text-[var(--text-tertiary)]" />
          )}
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] font-medium">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editMode && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1 text-[var(--text-tertiary)] hover:text-red-400"
            >
              <X size={12} />
            </button>
          )}
          {isOpen ? (
            <ChevronUp size={12} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}

// Settings Modal for widget configuration
function WidgetSettingsModal({
  isOpen,
  onClose,
  widgetOrder,
  onToggleWidget,
  onMoveWidget,
}: {
  isOpen: boolean
  onClose: () => void
  widgetOrder: { id: SidebarWidgetId; visible: boolean }[]
  onToggleWidget: (id: SidebarWidgetId) => void
  onMoveWidget: (id: SidebarWidgetId, direction: 'up' | 'down') => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">Configure Widgets</h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Toggle widgets and use arrows to reorder them.
          </p>
          <div className="space-y-1">
            {widgetOrder.map((item, index) => {
              const widget = SIDEBAR_WIDGETS.find(w => w.id === item.id)
              if (!widget) return null

              return (
                <div
                  key={widget.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border transition-colors",
                    item.visible
                      ? "bg-[var(--bg-secondary)] border-[var(--border)]"
                      : "bg-transparent border-transparent opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={() => onToggleWidget(widget.id)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text-primary)] flex-1">{widget.title}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onMoveWidget(widget.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => onMoveWidget(widget.id, 'down')}
                      disabled={index === widgetOrder.length - 1}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// Storage key for sidebar widget configuration
const SIDEBAR_WIDGETS_KEY = 'vibe-sidebar-widgets-v2'

// Widget order item type
interface WidgetOrderItem {
  id: SidebarWidgetId
  visible: boolean
}

// Default widget order (used for SSR and initial render)
const DEFAULT_WIDGET_ORDER: WidgetOrderItem[] = SIDEBAR_WIDGETS.map(w => ({
  id: w.id,
  visible: w.defaultVisible,
}))

function storeWidgetOrder(order: WidgetOrderItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_WIDGETS_KEY, JSON.stringify(order))
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState<WidgetOrderItem[]>(DEFAULT_WIDGET_ORDER)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage after hydration to avoid mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDGETS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetOrderItem[]
        // Ensure all widgets are present (in case new ones were added)
        const existingIds = new Set(parsed.map(p => p.id))
        const merged = [
          ...parsed,
          ...SIDEBAR_WIDGETS
            .filter(w => !existingIds.has(w.id))
            .map(w => ({ id: w.id, visible: w.defaultVisible }))
        ]
        setWidgetOrder(merged)
      }
    } catch (e) {
      console.error('Error loading sidebar widgets:', e)
    }
    setIsHydrated(true)
  }, [])

  const toggleWidget = (id: SidebarWidgetId) => {
    setWidgetOrder(prev => {
      const newOrder = prev.map(item =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
      storeWidgetOrder(newOrder)
      return newOrder
    })
  }

  const moveWidget = (id: SidebarWidgetId, direction: 'up' | 'down') => {
    setWidgetOrder(prev => {
      const index = prev.findIndex(item => item.id === id)
      if (index === -1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newOrder = [...prev]
      const [moved] = newOrder.splice(index, 1)
      newOrder.splice(newIndex, 0, moved)

      storeWidgetOrder(newOrder)
      return newOrder
    })
  }

  // Get visible widgets in the user's order
  const activeWidgets = widgetOrder
    .filter(item => item.visible)
    .map(item => SIDEBAR_WIDGETS.find(w => w.id === item.id))
    .filter((w): w is SidebarWidgetConfig => w !== undefined)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-8 top-3 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-20"
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <PanelRightClose size={20} /> : <PanelRight size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col transition-all duration-300 ease-out',
          isOpen ? 'w-[320px] animate-slide-in' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
              title="Configure widgets"
            >
              <Settings2 size={16} />
            </button>
            <span className="font-display text-xl tracking-tight text-[var(--text-primary)]">Widgets</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {activeWidgets.map(widget => {
            const WidgetComponent = widget.component

            return (
              <CollapsibleSection
                key={widget.id}
                title={widget.title}
                defaultOpen={true}
              >
                <WidgetComponent />
              </CollapsibleSection>
            )
          })}

          {activeWidgets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-sm text-[var(--text-tertiary)] mb-4">No widgets enabled</p>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-xs uppercase tracking-wider rounded"
              >
                <Plus size={14} />
                Add Widgets
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
            Synced with Supabase
          </p>
        </div>
      </aside>

      {/* Settings Modal */}
      <WidgetSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetOrder={widgetOrder}
        onToggleWidget={toggleWidget}
        onMoveWidget={moveWidget}
      />
    </>
  )
}
