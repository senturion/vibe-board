export function extractJsonString(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) return fenced[1].trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed
    }

    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1)
    }

    return ''
  }

  if (Array.isArray(value)) {
    return value.map(item => extractJsonString(item)).join('\n').trim()
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.text === 'string') return extractJsonString(record.text)
    if (typeof record.content === 'string') return extractJsonString(record.content)
    if (record.message) return extractJsonString(record.message)
  }

  return ''
}
