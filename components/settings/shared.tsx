'use client'

import type { ElementType } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoalPlannerProvider } from '@/lib/types'

export type SettingsSection = 'general' | 'ai' | 'board' | 'notifications' | 'workLocation' | 'habits' | 'routines' | 'journal' | 'focus' | 'calendar'

export const GOAL_PLANNER_PROVIDERS: { id: GoalPlannerProvider; label: string; note: string }[] = [
  { id: 'rules', label: 'Rules (No LLM)', note: 'Deterministic templates' },
  { id: 'openai', label: 'OpenAI', note: 'Uses server OpenAI config' },
  { id: 'anthropic', label: 'Anthropic (Claude)', note: 'Claude via Anthropic API' },
  { id: 'openai-compatible', label: 'OpenAI-Compatible', note: 'vLLM / LM Studio / others' },
  { id: 'ollama', label: 'Ollama', note: 'Local open-source model' },
]

export const PROVIDER_PLACEHOLDERS: Record<string, { model: string; baseUrl: string; apiKey: string }> = {
  openai: { model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-...' },
  anthropic: { model: 'claude-sonnet-4-5-20250929', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant-...' },
  'openai-compatible': { model: 'gpt-4.1-mini', baseUrl: 'http://localhost:8000/v1', apiKey: 'sk-...' },
  ollama: { model: 'llama3.1', baseUrl: 'http://localhost:11434', apiKey: '' },
}

interface SectionHeaderProps {
  section: SettingsSection
  icon: ElementType
  title: string
  expanded: boolean
  onToggle: (section: SettingsSection) => void
}

export function SectionHeader({ section, icon: Icon, title, expanded, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={() => onToggle(section)}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[var(--accent)]" />
        <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] font-medium">
          {title}
        </span>
      </div>
      {expanded ? (
        <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
      ) : (
        <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
      )}
    </button>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border)]'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}

interface NumberInputProps {
  value: number
  onChange: (val: number) => void
  label: string
  min?: number
  max?: number
  suffix?: string
}

export function NumberInput({ value, onChange, label, min = 1, max = 999, suffix }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value) || min
            onChange(Math.max(min, Math.min(max, val)))
          }}
          min={min}
          max={max}
          className="w-16 bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] text-center outline-none focus:border-[var(--accent)]"
        />
        {suffix && <span className="text-[10px] text-[var(--text-tertiary)]">{suffix}</span>}
      </div>
    </div>
  )
}
