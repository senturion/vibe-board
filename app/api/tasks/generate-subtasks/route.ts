import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { complete } from '@/lib/ai'
import { parseStoredAISettings, parseRequestOverrides, mergeAISettings } from '@/lib/ai/resolveUserAISettings'

const SYSTEM_PROMPT = `You are a task breakdown assistant. Given a task title and optional description, generate concise, actionable subtasks.

Rules:
- Return a JSON object with a "subtasks" array of strings
- Each subtask should be a short, actionable item (2-8 words)
- Generate 3-6 subtasks depending on task complexity
- Do not repeat existing subtasks
- Do not include the parent task itself as a subtask
- Focus on concrete, specific actions`

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
  const existingSubtasks: string[] = Array.isArray(body.existingSubtasks)
    ? body.existingSubtasks.filter((s: unknown) => typeof s === 'string')
    : []
  const priority = typeof body.priority === 'string' ? body.priority : ''
  const labels = Array.isArray(body.labels)
    ? body.labels.filter((l: unknown) => typeof l === 'string')
    : []

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
  if (labels.length > 0) prompt += `\nLabels: ${labels.join(', ')}`
  if (existingSubtasks.length > 0) prompt += `\nExisting subtasks (do not repeat): ${existingSubtasks.join(', ')}`

  try {
    const useJsonSchema = aiSettings.provider === 'ollama'
    const result = await complete(aiSettings, {
      system: SYSTEM_PROMPT,
      prompt,
      model: aiSettings.model || '',
      temperature: 0.3,
      maxTokens: 500,
      jsonMode: !useJsonSchema,
      ...(useJsonSchema ? {
        jsonSchema: {
          type: 'object',
          properties: { subtasks: { type: 'array', items: { type: 'string' } } },
          required: ['subtasks'],
        },
      } : {}),
    })

    const parsed = JSON.parse(result.text)
    const rawSubtasks: unknown[] = Array.isArray(parsed.subtasks) ? parsed.subtasks : []

    const existingLower = new Set(existingSubtasks.map(s => s.toLowerCase()))
    const subtasks = rawSubtasks
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map(s => s.trim())
      .filter(s => !existingLower.has(s.toLowerCase()))
      .slice(0, 8)

    return NextResponse.json({ subtasks })
  } catch (err) {
    console.error('Subtask generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate subtasks' }, { status: 500 })
  }
}
