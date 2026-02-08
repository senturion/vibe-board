import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { complete } from '@/lib/ai'
import { parseStoredAISettings, parseRequestOverrides, mergeAISettings } from '@/lib/ai/resolveUserAISettings'
import { extractJsonString } from '@/lib/ai/json'

const SYSTEM_PROMPT = `You are a task planning assistant. Given a task title and optional details, generate 1-3 short clarifying questions that would help break the task into better subtasks.

Rules:
- Return a JSON object with a "questions" array of strings
- Each question should be concise (one sentence)
- Focus on: scope, success criteria, dependencies, or priorities
- Do not ask obvious questions that are already answered by the title/description
- If the task is already very clear and specific, return an empty array`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const priority = typeof body.priority === 'string' ? body.priority : ''

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

  // Build prompt
  let prompt = `Task: ${title}`
  if (description) prompt += `\nDescription: ${description}`
  if (priority) prompt += `\nPriority: ${priority}`

  try {
    const result = await complete(aiSettings, {
      system: SYSTEM_PROMPT,
      prompt,
      model: aiSettings.model || '',
      temperature: 0.4,
      maxTokens: 300,
      jsonMode: true,
    })

    const jsonStr = extractJsonString(result.text)
    const parsed = JSON.parse(jsonStr)
    const questions: string[] = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q: unknown) => typeof q === 'string' && (q as string).trim().length > 0).slice(0, 3)
      : []

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('Clarify questions failed:', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
