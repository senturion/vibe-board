'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardWidget, WidgetType, WIDGET_TYPES } from '@/lib/types'
import type { Json } from '@/lib/supabase/types'

const DEFAULT_WIDGETS: Omit<DashboardWidget, 'id' | 'createdAt'>[] = [
  { widgetType: 'focus', positionX: 0, positionY: 0, width: 1, height: 1, config: {}, isVisible: true },
  { widgetType: 'stats', positionX: 1, positionY: 0, width: 2, height: 1, config: {}, isVisible: true },
  { widgetType: 'habits', positionX: 0, positionY: 1, width: 2, height: 2, config: {}, isVisible: true },
  { widgetType: 'routines', positionX: 2, positionY: 1, width: 1, height: 2, config: {}, isVisible: true },
  { widgetType: 'goals', positionX: 0, positionY: 3, width: 1, height: 2, config: {}, isVisible: true },
  { widgetType: 'tasks', positionX: 1, positionY: 3, width: 1, height: 2, config: {}, isVisible: true },
  { widgetType: 'journal', positionX: 2, positionY: 3, width: 1, height: 1, config: {}, isVisible: true },
]

export function useDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const { user } = useAuth()
  const supabase = createClient()

  // Initialize default widgets for new users
  const initializeDefaultWidgets = useCallback(async () => {
    if (!user) return

    const widgetsToCreate = DEFAULT_WIDGETS.map(w => ({
      user_id: user.id,
      widget_type: w.widgetType,
      position_x: w.positionX,
      position_y: w.positionY,
      width: w.width,
      height: w.height,
      config: w.config as Json,
      is_visible: w.isVisible,
    }))

    const { data, error } = await supabase
      .from('dashboard_widgets')
      .insert(widgetsToCreate)
      .select()

    if (error) {
      console.error('Error initializing widgets:', error)
      return
    }

    if (data) {
      const mappedWidgets: DashboardWidget[] = data.map(w => ({
        id: w.id,
        widgetType: w.widget_type as WidgetType,
        title: w.title || undefined,
        positionX: w.position_x,
        positionY: w.position_y,
        width: w.width,
        height: w.height,
        config: (w.config as Record<string, unknown>) || {},
        isVisible: w.is_visible,
        createdAt: new Date(w.created_at).getTime(),
      }))
      setWidgets(mappedWidgets)
    }
  }, [user, supabase])

  // Fetch widgets
  useEffect(() => {
    let isActive = true
    const fetchWidgets = async () => {
      if (!user) {
        // Use default widgets for unauthenticated users
        const defaultWithIds = DEFAULT_WIDGETS.map((w, i) => ({
          ...w,
          id: `default-${i}`,
          createdAt: Date.now(),
        }))
        if (isActive) {
          setWidgets(defaultWithIds)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true })

      if (error) {
        console.error('Error fetching widgets:', error)
        if (isActive) {
          setLoading(false)
        }
        return
      }

      if (data && data.length > 0) {
        const mappedWidgets: DashboardWidget[] = data.map(w => ({
          id: w.id,
          widgetType: w.widget_type as WidgetType,
          title: w.title || undefined,
          positionX: w.position_x,
          positionY: w.position_y,
          width: w.width,
          height: w.height,
          config: (w.config as Record<string, unknown>) || {},
          isVisible: w.is_visible,
          createdAt: new Date(w.created_at).getTime(),
        }))
        if (isActive) {
          setWidgets(mappedWidgets)
        }
      } else {
        // Initialize with default widgets
        await initializeDefaultWidgets()
      }

      if (isActive) {
        setLoading(false)
      }
    }

    fetchWidgets()
    return () => {
      isActive = false
    }
  }, [user, supabase, initializeDefaultWidgets])

  // Add widget
  const addWidget = useCallback(async (widgetType: WidgetType) => {
    const widgetInfo = WIDGET_TYPES.find(w => w.id === widgetType)
    if (!widgetInfo) return

    // Find next available position
    const maxY = widgets.reduce((max, w) => Math.max(max, w.positionY + w.height), 0)

    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(),
      widgetType,
      positionX: 0,
      positionY: maxY,
      width: widgetInfo.defaultSize.width,
      height: widgetInfo.defaultSize.height,
      config: {},
      isVisible: true,
      createdAt: Date.now(),
    }

    setWidgets(prev => [...prev, newWidget])

    if (user) {
      const { error } = await supabase
        .from('dashboard_widgets')
        .insert({
          id: newWidget.id,
          user_id: user.id,
          widget_type: newWidget.widgetType,
          position_x: newWidget.positionX,
          position_y: newWidget.positionY,
          width: newWidget.width,
          height: newWidget.height,
          config: newWidget.config as Json,
          is_visible: newWidget.isVisible,
        })

      if (error) {
        console.error('Error adding widget:', error)
        setWidgets(prev => prev.filter(w => w.id !== newWidget.id))
      }
    }
  }, [user, supabase, widgets])

  // Remove widget
  const removeWidget = useCallback(async (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    setWidgets(prev => prev.filter(w => w.id !== widgetId))

    if (user) {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId)

      if (error) {
        console.error('Error removing widget:', error)
        setWidgets(prev => [...prev, widget])
      }
    }
  }, [user, supabase, widgets])

  // Update widget
  const updateWidget = useCallback(async (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(prev => prev.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    ))

    if (user) {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.positionX !== undefined) dbUpdates.position_x = updates.positionX
      if (updates.positionY !== undefined) dbUpdates.position_y = updates.positionY
      if (updates.width !== undefined) dbUpdates.width = updates.width
      if (updates.height !== undefined) dbUpdates.height = updates.height
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.config !== undefined) dbUpdates.config = updates.config
      if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible

      const { error } = await supabase
        .from('dashboard_widgets')
        .update(dbUpdates)
        .eq('id', widgetId)

      if (error) {
        console.error('Error updating widget:', error)
      }
    }
  }, [user, supabase])

  // Update layout (batch update positions)
  const updateLayout = useCallback(async (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets)

    if (user) {
      // Batch update all widget positions
      const updates = newWidgets.map(w => ({
        id: w.id,
        user_id: user.id,
        widget_type: w.widgetType,
        position_x: w.positionX,
        position_y: w.positionY,
        width: w.width,
        height: w.height,
        config: w.config as Json,
        is_visible: w.isVisible,
      }))

      const { error } = await supabase
        .from('dashboard_widgets')
        .upsert(updates)

      if (error) {
        console.error('Error updating layout:', error)
      }
    }
  }, [user, supabase])

  // Toggle widget visibility
  const toggleWidget = useCallback(async (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    await updateWidget(widgetId, { isVisible: !widget.isVisible })
  }, [widgets, updateWidget])

  // Reset to default layout
  const resetLayout = useCallback(async () => {
    if (!user) {
      const defaultWithIds = DEFAULT_WIDGETS.map((w, i) => ({
        ...w,
        id: `default-${i}`,
        createdAt: Date.now(),
      }))
      setWidgets(defaultWithIds)
      return
    }

    // Delete all existing widgets
    await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('user_id', user.id)

    // Reinitialize with defaults
    await initializeDefaultWidgets()
  }, [user, supabase, initializeDefaultWidgets])

  // Get visible widgets sorted by position
  const visibleWidgets = widgets
    .filter(w => w.isVisible)
    .sort((a, b) => {
      if (a.positionY !== b.positionY) return a.positionY - b.positionY
      return a.positionX - b.positionX
    })

  // Get available widget types (not already added)
  const availableWidgetTypes = WIDGET_TYPES.filter(
    wt => !widgets.some(w => w.widgetType === wt.id)
  )

  return {
    widgets,
    visibleWidgets,
    loading,
    editMode,
    setEditMode,
    addWidget,
    removeWidget,
    updateWidget,
    updateLayout,
    toggleWidget,
    resetLayout,
    availableWidgetTypes,
  }
}
