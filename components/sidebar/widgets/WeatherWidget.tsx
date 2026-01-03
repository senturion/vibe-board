'use client'

import { useState, useEffect } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Loader2, MapPin, RefreshCw } from 'lucide-react'

interface WeatherData {
  temp: number
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy'
  location: string
  high: number
  low: number
  fetchedAt: number
}

interface CachedLocation {
  latitude: number
  longitude: number
  locationName: string
}

const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
}

const CACHE_KEY = 'vibe-weather-location'
const WEATHER_CACHE_KEY = 'vibe-weather-data'
const WEATHER_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherData = async (latitude: number, longitude: number, locationName: string) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto`
      )

      if (!response.ok) throw new Error('Weather fetch failed')

      const data = await response.json()

      // Map weather codes to conditions
      const weatherCode = data.current.weather_code
      let condition: WeatherData['condition'] = 'cloudy'
      if (weatherCode <= 1) condition = 'sunny'
      else if (weatherCode <= 48) condition = 'cloudy'
      else if (weatherCode <= 67) condition = 'rainy'
      else if (weatherCode <= 77) condition = 'snowy'
      else if (weatherCode <= 82) condition = 'rainy'
      else condition = 'snowy'

      const weatherData: WeatherData = {
        temp: Math.round(data.current.temperature_2m),
        condition,
        location: locationName,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        fetchedAt: Date.now(),
      }

      // Cache weather data
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData))
      setWeather(weatherData)
      setLoading(false)
    } catch {
      setError('Could not load weather')
      setLoading(false)
    }
  }

  const getLocationAndFetch = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Get location name
        let locationName = 'Your Location'
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          if (geoResponse.ok) {
            const geoData = await geoResponse.json()
            locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Your Location'
          }
        } catch {
          // Ignore geocoding errors
        }

        // Cache location
        const cachedLocation: CachedLocation = { latitude, longitude, locationName }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachedLocation))

        await fetchWeatherData(latitude, longitude, locationName)
      },
      () => {
        setError('Location access denied')
        setLoading(false)
      }
    )
  }

  useEffect(() => {
    // Check for cached weather data first
    const cachedWeather = localStorage.getItem(WEATHER_CACHE_KEY)
    if (cachedWeather) {
      const parsed = JSON.parse(cachedWeather) as WeatherData
      // Use cache if less than 30 minutes old
      if (Date.now() - parsed.fetchedAt < WEATHER_CACHE_DURATION) {
        setWeather(parsed)
        setLoading(false)
        return
      }
    }

    // Check for cached location
    const cachedLocation = localStorage.getItem(CACHE_KEY)
    if (cachedLocation) {
      const { latitude, longitude, locationName } = JSON.parse(cachedLocation) as CachedLocation
      fetchWeatherData(latitude, longitude, locationName)
    } else {
      // No cached location, need to ask
      getLocationAndFetch()
    }
  }, [])

  if (loading) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center">
        <Loader2 size={16} className="text-[var(--text-tertiary)] animate-spin" />
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
          <Cloud size={14} />
          <span className="text-[11px]">{error || 'Weather unavailable'}</span>
        </div>
      </div>
    )
  }

  const WeatherIcon = WEATHER_ICONS[weather.condition]

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WeatherIcon size={20} className="text-[var(--accent)]" />
          <span className="text-xl font-medium text-[var(--text-primary)]">
            {weather.temp}°
          </span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <MapPin size={10} />
            {weather.location}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            H:{weather.high}° L:{weather.low}°
          </p>
        </div>
      </div>
    </div>
  )
}
