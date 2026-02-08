import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { complete } from '@/lib/ai'
import { parseStoredAISettings, parseRequestOverrides, mergeAISettings } from '@/lib/ai/resolveUserAISettings'

const SYSTEM_PROMPT = `You are a thoughtful journaling coach. Generate a specific, personal 1-2 sentence writing prompt that encourages reflection and self-awareness.

Guidelines:
- Be specific, not generic. Avoid clichés like "What are you grateful for?"
- If mood data is provided, tailor the prompt to the user's emotional patterns
- If goals are provided, occasionally reference them for motivation
- Vary between introspection, gratitude, growth, creativity, and relationships
- Return only the prompt text, no quotes or prefix`

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

  // Build context for the prompt
  const parts: string[] = []

  const recentEntries = Array.isArray(body.recentEntries) ? body.recentEntries.slice(0, 5) : []
  if (recentEntries.length > 0) {
    const moodSummary = recentEntries
      .filter((e: { date?: string; mood?: number }) => e.mood != null)
      .map((e: { date?: string; mood?: number }) => `${e.date}: mood ${e.mood}/5`)
      .join(', ')
    if (moodSummary) parts.push(`Recent moods: ${moodSummary}`)
  }

  if (typeof body.moodTrend === 'number') {
    parts.push(`7-day mood average: ${body.moodTrend.toFixed(1)}/5`)
  }

  const goalTitles = Array.isArray(body.activeGoalTitles)
    ? body.activeGoalTitles.filter((t: unknown) => typeof t === 'string').slice(0, 5)
    : []
  if (goalTitles.length > 0) {
    parts.push(`Active goals: ${goalTitles.join(', ')}`)
  }

  const prompt = parts.length > 0
    ? `Context about the user:\n${parts.join('\n')}\n\nGenerate a journaling prompt.`
    : 'Generate a journaling prompt.'

  try {
    const result = await complete(aiSettings, {
      system: SYSTEM_PROMPT,
      prompt,
      model: aiSettings.model || '',
      temperature: 0.7,
      maxTokens: 200,
    })

    return NextResponse.json({ prompt: result.text.trim() })
  } catch (err) {
    console.error('Journal prompt generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 })
  }
}
