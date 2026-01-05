'use client'

import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Loader2 } from 'lucide-react'
import { useWeather } from '@/hooks/useWeather'

const weatherIcons = {
  clear: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  stormy: CloudLightning,
  foggy: CloudFog,
}

export function DateWeather() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const { weather, loading, error } = useWeather()

  useEffect(() => {
    // Update date every minute
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const WeatherIcon = weather ? weatherIcons[weather.condition] : null

  return (
    <div className="flex items-center gap-4 text-[var(--text-secondary)]">
      {/* Date */}
      <time className="font-display text-[14px] italic tracking-wide" suppressHydrationWarning>
        {formattedDate}
      </time>

      {/* Weather */}
      <div className="flex items-center gap-2 text-[12px]">
        {loading ? (
          <Loader2 size={14} className="animate-spin text-[var(--text-tertiary)]" />
        ) : error ? (
          <span className="text-[var(--text-tertiary)] text-[11px]">—</span>
        ) : weather ? (
          <>
            {WeatherIcon && (
              <WeatherIcon
                size={16}
                className={
                  weather.condition === 'clear'
                    ? 'text-amber-400'
                    : weather.condition === 'rainy' || weather.condition === 'stormy'
                    ? 'text-blue-400'
                    : weather.condition === 'snowy'
                    ? 'text-sky-200'
                    : 'text-[var(--text-tertiary)]'
                }
              />
            )}
            <span className="font-medium">{weather.temperature}°</span>
            <span className="text-[var(--text-tertiary)] hidden sm:inline">{weather.description}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}
