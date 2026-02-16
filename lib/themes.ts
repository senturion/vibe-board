export type ThemeId = 'ember' | 'sand' | 'midnight' | 'forest' | 'nord' | 'mono' | 'ocean' | 'paper'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  type: 'dark' | 'light'
  colors: { bg: string; accent: string }
}

export const THEMES: ThemeDefinition[] = [
  { id: 'ember',    name: 'Ember',    type: 'dark',  colors: { bg: '#0c0b0a', accent: '#e07a5f' } },
  { id: 'sand',     name: 'Sand',     type: 'light', colors: { bg: '#faf8f5', accent: '#d4694e' } },
  { id: 'midnight', name: 'Midnight', type: 'dark',  colors: { bg: '#0a0e1a', accent: '#6c8aec' } },
  { id: 'forest',   name: 'Forest',   type: 'dark',  colors: { bg: '#0b120d', accent: '#c4a35a' } },
  { id: 'nord',     name: 'Nord',     type: 'dark',  colors: { bg: '#1a1e2e', accent: '#88c0d0' } },
  { id: 'mono',     name: 'Mono',     type: 'dark',  colors: { bg: '#111111', accent: '#ffffff' } },
  { id: 'ocean',    name: 'Ocean',    type: 'dark',  colors: { bg: '#0a1419', accent: '#4db8a4' } },
  { id: 'paper',    name: 'Paper',    type: 'light', colors: { bg: '#f4f1ec', accent: '#2d2d2d' } },
]

export const DEFAULT_DARK_THEME: ThemeId = 'ember'
export const DEFAULT_LIGHT_THEME: ThemeId = 'sand'

export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find(t => t.id === id)
}

export function isValidThemeId(id: string): id is ThemeId {
  return THEMES.some(t => t.id === id)
}

/** Map legacy 'dark'/'light' values to new theme IDs */
export function migrateLegacyTheme(value: string): ThemeId {
  if (value === 'dark') return 'ember'
  if (value === 'light') return 'sand'
  if (isValidThemeId(value)) return value
  return DEFAULT_DARK_THEME
}
