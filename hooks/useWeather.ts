'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
  temperature: number
  condition: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy'
  description: string
}

interface UseWeatherReturn {
  weather: WeatherData | null
  loading: boolean
  error: string | null
}

// Map WMO weather codes to conditions
// https://open-meteo.com/en/docs
function getCondition(code: number): WeatherData['condition'] {
  if (code === 0 || code === 1) return 'clear'
  if (code >= 2 && code <= 3) return 'cloudy'
  if (code >= 45 && code <= 48) return 'foggy'
  if (code >= 51 && code <= 67) return 'rainy'
  if (code >= 71 && code <= 77) return 'snowy'
  if (code >= 80 && code <= 82) return 'rainy'
  if (code >= 85 && code <= 86) return 'snowy'
  if (code >= 95 && code <= 99) return 'stormy'
  return 'cloudy'
}

function getDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  }
  return descriptions[code] || 'Unknown'
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchWeather() {
      try {
        // Get user's location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'))
            return
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 300000, // Cache for 5 minutes
          })
        })

        const { latitude, longitude } = position.coords

        // Fetch weather from Open-Meteo (free, no API key)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        )

        if (!response.ok) {
          throw new Error('Weather fetch failed')
        }

        const data = await response.json()

        if (cancelled) return

        const code = data.current.weather_code
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          condition: getCondition(code),
          description: getDescription(code),
        })
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to get weather')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchWeather()

    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { weather, loading, error }
}
