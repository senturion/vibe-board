export interface JournalPrompt {
  id: string
  promptText: string
  isActive: boolean
  order: number
  createdAt: number
}

export interface JournalEntry {
  id: string
  entryDate: string // YYYY-MM-DD
  content: string
  mood?: number // 1-10 scale
  moodEmoji?: string
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: number
  updatedAt: number
}

export const DEFAULT_JOURNAL_PROMPTS: string[] = [
  'What are you grateful for today?',
  'What was the highlight of your day?',
  'What challenged you today?',
  'What did you learn today?',
  'How are you feeling right now?',
  'What are your intentions for tomorrow?',
]
