import { Goal, GoalPriority, GoalTaskPlanOptions, GoalTaskSuggestion, Milestone, Priority } from '@/lib/types'

type MilestoneIntent = 'learning' | 'writing' | 'build' | 'launch' | 'fitness' | 'organize' | 'general'

type TemplateKey = GoalTaskSuggestion['template']

interface TemplateDefinition {
  key: TemplateKey
  title: (subject: string) => string
  description: (context: string) => string
}

const TEMPLATE_SETS: Record<MilestoneIntent, TemplateDefinition[]> = {
  learning: [
    {
      key: 'scope',
      title: (subject) => `Curate resources for ${subject}`,
      description: (context) => withContext(
        'Pick 2-3 high-quality resources and define what done looks like for this learning block.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Complete focused study session: ${subject}`,
      description: (context) => withContext(
        'Finish one focused learning session and capture concise notes or flashcards.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Summarize lessons for ${subject}`,
      description: (context) => withContext(
        'Write what was learned, what remains unclear, and the next study action.',
        context
      ),
    },
  ],
  writing: [
    {
      key: 'scope',
      title: (subject) => `Outline ${subject}`,
      description: (context) => withContext(
        'Create a clear structure with key points, sections, and intended audience.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Draft ${subject}`,
      description: (context) => withContext(
        'Write a complete first draft without over-editing so momentum stays high.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Edit and finalize ${subject}`,
      description: (context) => withContext(
        'Revise for clarity, tighten wording, and prepare the final version.',
        context
      ),
    },
  ],
  build: [
    {
      key: 'scope',
      title: (subject) => `Define implementation plan for ${subject}`,
      description: (context) => withContext(
        'Break implementation into concrete steps, interfaces, and acceptance criteria.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Build first working version of ${subject}`,
      description: (context) => withContext(
        'Ship a minimal functional version that proves the core path works end-to-end.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Test and polish ${subject}`,
      description: (context) => withContext(
        'Test critical flows, fix defects, and refine edge-case behavior.',
        context
      ),
    },
  ],
  launch: [
    {
      key: 'scope',
      title: (subject) => `Create launch checklist for ${subject}`,
      description: (context) => withContext(
        'List launch prerequisites, owners, and go/no-go checks.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Prepare release assets for ${subject}`,
      description: (context) => withContext(
        'Finalize release notes, messaging, and required launch assets.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Run launch and post-launch review for ${subject}`,
      description: (context) => withContext(
        'Execute launch, monitor results, and log immediate follow-up actions.',
        context
      ),
    },
  ],
  fitness: [
    {
      key: 'scope',
      title: (subject) => `Plan training block for ${subject}`,
      description: (context) => withContext(
        'Set workout schedule, target effort, and recovery checkpoints.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Complete key training session for ${subject}`,
      description: (context) => withContext(
        'Do the highest-impact workout for this stage and record results.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Review performance for ${subject}`,
      description: (context) => withContext(
        'Evaluate progress trends and adjust pace, load, or technique.',
        context
      ),
    },
  ],
  organize: [
    {
      key: 'scope',
      title: (subject) => `Break down next steps for ${subject}`,
      description: (context) => withContext(
        'Turn this milestone into ordered, measurable steps with owners and deadlines.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Finish highest-impact task for ${subject}`,
      description: (context) => withContext(
        'Complete the one task that removes the most uncertainty or risk.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Clear blockers for ${subject}`,
      description: (context) => withContext(
        'Identify blockers and resolve or delegate them so work can continue smoothly.',
        context
      ),
    },
  ],
  general: [
    {
      key: 'scope',
      title: (subject) => `Break down ${subject}`,
      description: (context) => withContext(
        'Clarify scope and define concrete outputs for this milestone.',
        context
      ),
    },
    {
      key: 'first_action',
      title: (subject) => `Take first concrete step on ${subject}`,
      description: (context) => withContext(
        'Complete one meaningful action that moves this milestone forward today.',
        context
      ),
    },
    {
      key: 'review',
      title: (subject) => `Review progress on ${subject}`,
      description: (context) => withContext(
        'Assess what changed, what is blocked, and what to tackle next.',
        context
      ),
    },
  ],
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function withContext(base: string, context: string) {
  return context ? `${base} Context: ${context}` : base
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey?: string) {
  if (!dateKey) return null
  const parsed = new Date(`${dateKey}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function clampDateKey(dateKey: string, minDateKey: string, maxDateKey: string) {
  if (dateKey < minDateKey) return minDateKey
  if (dateKey > maxDateKey) return maxDateKey
  return dateKey
}

function mapGoalPriority(priority: GoalPriority): Priority {
  if (priority === 'high') return 'high'
  if (priority === 'low') return 'low'
  return 'medium'
}

function bumpPriority(priority: Priority): Priority {
  if (priority === 'low') return 'medium'
  if (priority === 'medium') return 'high'
  return priority
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trim()}...`
}

function buildContext(goal: Goal, milestone: Milestone) {
  const milestoneContext = milestone.description?.trim()
  if (milestoneContext) return truncate(milestoneContext, 120)
  const goalContext = goal.description?.trim()
  if (goalContext) return truncate(goalContext, 120)
  return ''
}

function cleanSubject(value: string) {
  return value.trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ')
}

function detectMilestoneIntent(milestone: Milestone, goal: Goal): MilestoneIntent {
  const text = `${milestone.title} ${milestone.description || ''} ${goal.title} ${goal.description || ''}`.toLowerCase()

  const has = (words: string[]) => words.some(word => text.includes(word))

  if (has(['write', 'draft', 'article', 'blog', 'book', 'doc', 'proposal', 'copy', 'script'])) return 'writing'
  if (has(['launch', 'release', 'ship', 'deploy', 'go live'])) return 'launch'
  if (has(['learn', 'study', 'course', 'read', 'research', 'language', 'certification', 'exam'])) return 'learning'
  if (has(['run', 'race', 'workout', 'training', 'gym', 'fitness', 'marathon'])) return 'fitness'
  if (has(['plan', 'roadmap', 'scope', 'organize', 'process', 'system', 'setup'])) return 'organize'
  if (has(['build', 'implement', 'develop', 'code', 'app', 'feature', 'prototype', 'design', 'create', 'make'])) return 'build'

  return 'general'
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function buildGoalTaskPlanHash(goalId: string, milestones: Milestone[], options: GoalTaskPlanOptions) {
  const milestoneSignature = milestones
    .map((milestone) => `${milestone.id}:${milestone.title}:${milestone.targetDate || ''}:${milestone.isCompleted ? '1' : '0'}:${milestone.order}`)
    .sort()
    .join('|')

  const raw = [
    goalId,
    options.boardId,
    options.column,
    String(options.horizonDays),
    String(options.maxTasks),
    milestoneSignature,
  ].join('::')

  return `plan_${hashString(raw)}`
}

export function generateGoalTaskSuggestions(params: {
  goal: Goal
  milestones: Milestone[]
  options: GoalTaskPlanOptions
  existingTaskTitles?: string[]
  now?: Date
}) {
  const { goal, milestones, options, existingTaskTitles = [], now = new Date() } = params

  const today = toDateKey(now)
  const endDate = toDateKey(addDays(now, Math.max(1, options.horizonDays) - 1))
  const planHash = buildGoalTaskPlanHash(goal.id, milestones, options)
  const seenTitles = new Set(existingTaskTitles.map(normalizeTitle))

  const incompleteMilestones = milestones
    .filter((milestone) => !milestone.isCompleted)
    .sort((a, b) => {
      const aDate = a.targetDate || '9999-12-31'
      const bDate = b.targetDate || '9999-12-31'
      if (aDate !== bDate) return aDate.localeCompare(bDate)
      return a.order - b.order
    })

  const sourceMilestones = incompleteMilestones.length > 0
    ? incompleteMilestones
    : [{
        id: `goal-${goal.id}`,
        goalId: goal.id,
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate,
        isCompleted: false,
        order: 0,
        createdAt: now.getTime(),
      }]

  const suggestionCandidates: GoalTaskSuggestion[] = []
  const basePriority = mapGoalPriority(goal.priority)
  const horizonWindow = Math.max(0, options.horizonDays - 1)
  const milestoneSpreadDivisor = Math.max(1, sourceMilestones.length - 1)
  const templateSpacing = Math.max(
    1,
    Math.floor(Math.max(1, options.horizonDays) / Math.max(3, sourceMilestones.length * 2))
  )

  sourceMilestones.forEach((milestone, milestoneIndex) => {
    const intent = detectMilestoneIntent(milestone, goal)
    const templates = TEMPLATE_SETS[intent]
    const subject = cleanSubject(milestone.title)
    const context = buildContext(goal, milestone)

    templates.forEach((template, templateIndex) => {
      const title = template.title(subject)
      const normalizedTitle = normalizeTitle(title)
      if (seenTitles.has(normalizedTitle)) return

      const milestoneOffset = Math.round((milestoneIndex / milestoneSpreadDivisor) * horizonWindow)
      const fallbackOffset = Math.min(horizonWindow, milestoneOffset + (templateIndex * templateSpacing))
      const dueFromSpread = toDateKey(addDays(now, fallbackOffset))

      const milestoneDate = parseDateKey(milestone.targetDate)
      let dueDate = dueFromSpread
      if (milestoneDate) {
        const offsetFromTarget = template.key === 'scope'
          ? -Math.min(7, Math.max(1, Math.floor(options.horizonDays / 2)))
          : template.key === 'first_action'
            ? -Math.min(3, Math.max(1, Math.floor(options.horizonDays / 3)))
            : 0
        const dueCandidate = addDays(milestoneDate, offsetFromTarget)
        dueDate = clampDateKey(toDateKey(dueCandidate), today, endDate)
      }

      const priority: Priority = template.key === 'first_action' ? bumpPriority(basePriority) : basePriority

      suggestionCandidates.push({
        id: `${milestone.id}-${template.key}-${milestoneIndex}-${templateIndex}`,
        goalId: goal.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        title,
        description: template.description(context),
        dueDate,
        priority,
        column: options.column,
        accepted: true,
        template: template.key,
        planHash,
      })

      seenTitles.add(normalizedTitle)
    })
  })

  return suggestionCandidates.slice(0, Math.max(1, options.maxTasks))
}
