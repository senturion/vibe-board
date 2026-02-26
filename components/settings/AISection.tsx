'use client'

import { Sparkles } from 'lucide-react'
import { GoalPlannerProvider } from '@/lib/types'
import { AppSettings } from '@/hooks/useSettings'
import { SectionHeader, SettingsSection, GOAL_PLANNER_PROVIDERS, PROVIDER_PLACEHOLDERS } from './shared'

interface AISectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function AISection({ expanded, onToggle, settings, updateSetting }: AISectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="ai" icon={Sparkles} title="AI" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Suggestion Engine</p>
            <select
              value={settings.aiProvider}
              onChange={(e) => updateSetting('aiProvider', e.target.value as GoalPlannerProvider)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              {GOAL_PLANNER_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
            <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
              {GOAL_PLANNER_PROVIDERS.find((provider) => provider.id === settings.aiProvider)?.note}
            </p>
          </div>

          {settings.aiProvider !== 'rules' && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Model Override (optional)</p>
              <input
                type="text"
                value={settings.aiModel}
                onChange={(e) => updateSetting('aiModel', e.target.value)}
                placeholder={PROVIDER_PLACEHOLDERS[settings.aiProvider]?.model ?? 'model name'}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          {settings.aiProvider !== 'rules' && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">API Base URL (optional)</p>
              <input
                type="text"
                value={settings.aiApiBaseUrl}
                onChange={(e) => updateSetting('aiApiBaseUrl', e.target.value)}
                placeholder={PROVIDER_PLACEHOLDERS[settings.aiProvider]?.baseUrl ?? 'https://...'}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          {settings.aiProvider !== 'rules' && settings.aiProvider !== 'ollama' && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">API Key (optional)</p>
              <input
                type="password"
                value={settings.aiApiKey}
                onChange={(e) => updateSetting('aiApiKey', e.target.value)}
                placeholder={PROVIDER_PLACEHOLDERS[settings.aiProvider]?.apiKey ?? 'API key'}
                autoComplete="off"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          <p className="text-[10px] text-[var(--text-tertiary)]">
            Provider/model/base URL sync with your account. API key stays on this device and is sent only when making AI requests.
          </p>
        </div>
      )}
    </div>
  )
}
