export interface HabitIconGroup {
  label: string
  icons: string[]
}

export const HABIT_ICON_GROUPS: HabitIconGroup[] = [
  {
    label: 'Fitness',
    icons: ['dumbbell', 'bike', 'footprints', 'heart', 'activity'],
  },
  {
    label: 'Wellness',
    icons: ['moon', 'sun', 'droplets', 'apple', 'leaf'],
  },
  {
    label: 'Mind',
    icons: ['book', 'book-open', 'brain', 'pencil', 'graduation-cap'],
  },
  {
    label: 'Social',
    icons: ['users', 'message-circle', 'phone', 'hand-heart'],
  },
  {
    label: 'Productivity',
    icons: ['clock', 'target', 'zap', 'check-square', 'list-todo'],
  },
  {
    label: 'Avoid',
    icons: ['ban', 'shield-x', 'circle-off', 'x-circle', 'coffee', 'wine', 'cigarette', 'smartphone'],
  },
]

export const ALL_HABIT_ICONS = HABIT_ICON_GROUPS.flatMap(g => g.icons)

export const DEFAULT_ICON = 'target'

/** Infer an icon from habit name keywords */
export function inferIconFromName(name: string): string {
  const lower = name.toLowerCase()
  const mappings: [string[], string][] = [
    [['read', 'book', 'study'], 'book'],
    [['water', 'drink', 'hydrat'], 'droplets'],
    [['run', 'jog', 'walk', 'step'], 'footprints'],
    [['gym', 'workout', 'exercise', 'lift', 'weight'], 'dumbbell'],
    [['meditat', 'mindful', 'breath'], 'brain'],
    [['sleep', 'bed', 'rest'], 'moon'],
    [['write', 'journal', 'diary'], 'pencil'],
    [['bike', 'cycle', 'cycling'], 'bike'],
    [['call', 'phone'], 'phone'],
    [['coffee'], 'coffee'],
    [['smoke', 'cigarette'], 'cigarette'],
    [['alcohol', 'drink', 'wine', 'beer'], 'wine'],
    [['screen', 'phone', 'social media'], 'smartphone'],
    [['eat', 'food', 'diet', 'fruit', 'vegetable'], 'apple'],
  ]

  for (const [keywords, icon] of mappings) {
    if (keywords.some(k => lower.includes(k))) return icon
  }

  return DEFAULT_ICON
}
