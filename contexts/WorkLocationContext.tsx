'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { WorkLocation, WorkLocationEntry, formatDateKey } from '@/lib/types'

interface WorkLocationContextType {
  locations: WorkLocationEntry[]
  loading: boolean
  getLocationForDate: (date: string) => WorkLocation | null
  setLocationForDate: (date: string, location: WorkLocation) => Promise<void>
  getTodaysLocation: () => WorkLocation | null
  getWeekLocations: () => { date: string; dayName: string; location: WorkLocation | null }[]
}

const WorkLocationContext = createContext<WorkLocationContextType | undefined>(undefined)

// Get start of week (Monday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get week dates (Mon-Fri)
function getWeekDates(startDate: Date = getWeekStart()): string[] {
  const dates: string[] = []
  for (let i = 0; i < 5; i++) { // Mon-Fri only
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(formatDateKey(d))
  }
  return dates
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function WorkLocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<WorkLocationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch locations for current and next week
  useEffect(() => {
    let isActive = true
    const fetchLocations = async () => {
      if (!user) {
        if (isActive) {
          setLocations([])
          setLoading(false)
        }
        return
      }

      // Fetch 2 weeks of data
      const weekStart = getWeekStart()
      const twoWeeksEnd = new Date(weekStart)
      twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 14)

      const { data, error } = await supabase
        .from('work_locations')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', formatDateKey(weekStart))
        .lte('date', formatDateKey(twoWeeksEnd))

      if (error) {
        console.error('Error fetching work locations:', error)
      }

      if (data && isActive) {
        setLocations(data.map(row => ({
          id: row.id,
          date: row.date,
          location: row.location as WorkLocation,
          createdAt: new Date(row.created_at).getTime(),
        })))
      }

      if (isActive) {
        setLoading(false)
      }
    }

    fetchLocations()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  const getLocationForDate = useCallback((date: string): WorkLocation | null => {
    const entry = locations.find(l => l.date === date)
    return entry?.location ?? null
  }, [locations])

  const getTodaysLocation = useCallback((): WorkLocation | null => {
    return getLocationForDate(formatDateKey())
  }, [getLocationForDate])

  const setLocationForDate = useCallback(async (date: string, location: WorkLocation): Promise<void> => {
    if (!user) return

    const existing = locations.find(l => l.date === date)

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('work_locations')
        .update({ location })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating work location:', error)
        return
      }

      setLocations(prev => prev.map(l =>
        l.id === existing.id ? { ...l, location } : l
      ))
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('work_locations')
        .insert({
          user_id: user.id,
          date,
          location,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating work location:', error)
        return
      }

      if (data) {
        setLocations(prev => [...prev, {
          id: data.id,
          date: data.date,
          location: data.location as WorkLocation,
          createdAt: new Date(data.created_at).getTime(),
        }])
      }
    }
  }, [user, locations, supabase])

  const getWeekLocations = useCallback(() => {
    const weekDates = getWeekDates()
    return weekDates.map((date, i) => ({
      date,
      dayName: DAY_NAMES[i],
      location: getLocationForDate(date),
    }))
  }, [getLocationForDate])

  const value = useMemo(() => ({
    locations,
    loading,
    getLocationForDate,
    setLocationForDate,
    getTodaysLocation,
    getWeekLocations,
  }), [locations, loading, getLocationForDate, setLocationForDate, getTodaysLocation, getWeekLocations])

  return (
    <WorkLocationContext.Provider value={value}>
      {children}
    </WorkLocationContext.Provider>
  )
}

export function useWorkLocation() {
  const context = useContext(WorkLocationContext)
  if (context === undefined) {
    throw new Error('useWorkLocation must be used within a WorkLocationProvider')
  }
  return context
}
