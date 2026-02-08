import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { complete } from '@/lib/ai'
import { parseStoredAISettings, parseRequestOverrides, mergeAISettings } from '@/lib/ai/resolveUserAISettings'

const SYSTEM_PROMPT = `You are a concise, motivational productivity coach. Given the user's daily stats, provide a 2-3 sentence insight that is encouraging, specific, and actionable.

Rules:
- Reference actual numbers from the stats
- Be warm but not cheesy
- If stats look good, celebrate progress. If low, gently encourage without guilt
- Occasionally suggest a small actionable tip
- Return only the insight text, no prefix or quotes`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  // Resolve AI settings
  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('app_settings')
    .eq('user_id', user.id)
    .maybeSingle()

  const stored = parseStoredAISettings(settingsRow?.app_settings || null)
  const overrides = parseRequestOverrides(body.aiSettings)
  const aiSettings = mergeAISettings(stored, overrides)

  if (!aiSettings) {
    return NextResponse.json({ error: 'AI provider not configured' }, { status: 400 })
  }

  const stats = body.stats && typeof body.stats === 'object' ? body.stats : {}

  const parts: string[] = []
  if (typeof stats.habitsCompletedToday === 'number' && typeof stats.habitsActiveToday === 'number') {
    parts.push(`Habits: ${stats.habitsCompletedToday}/${stats.habitsActiveToday} completed today`)
  }
  if (typeof stats.activeGoalCount === 'number') {
    parts.push(`Active goals: ${stats.activeGoalCount}`)
  }
  if (typeof stats.nearestGoalDeadline === 'string') {
    parts.push(`Nearest goal deadline: ${stats.nearestGoalDeadline}`)
  }
  if (typeof stats.moodAvg7d === 'number') {
    parts.push(`7-day mood average: ${stats.moodAvg7d.toFixed(1)}/5`)
  }
  if (typeof stats.focusMinutesToday === 'number') {
    parts.push(`Focus time today: ${stats.focusMinutesToday} minutes`)
  }
  if (typeof stats.routinesCompletedToday === 'number' && typeof stats.routinesActiveToday === 'number') {
    parts.push(`Routines: ${stats.routinesCompletedToday}/${stats.routinesActiveToday} completed today`)
  }
  if (typeof stats.journalStreak === 'number') {
    parts.push(`Journal streak: ${stats.journalStreak} days`)
  }

  const prompt = parts.length > 0
    ? `Today's stats:\n${parts.join('\n')}\n\nProvide a daily insight.`
    : 'No stats available yet. Provide an encouraging insight for someone just getting started.'

  try {
    const result = await complete(aiSettings, {
      system: SYSTEM_PROMPT,
      prompt,
      model: aiSettings.model || '',
      temperature: 0.5,
      maxTokens: 300,
    })

    return NextResponse.json({ insight: result.text.trim() })
  } catch (err) {
    console.error('Insight generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
