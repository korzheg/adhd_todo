import type { AppSettings, DraftAnalysis, LifeAreaId, TodoItem } from '../types/domain'
import { fallbackAnalyzeTodo } from './classify'

const LIFE_AREA_IDS: LifeAreaId[] = ['finances', 'education', 'food', 'activity', 'home', 'admin', 'socialRest']

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}

async function requestJson(settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<unknown | null> {
  if (!settings.llmEnabled || !settings.apiKey.trim()) {
    return null
  }

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as ChatResponse
    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      return null
    }

    return JSON.parse(content)
  } catch {
    return null
  }
}

function normalizeCategory(category: unknown, fallback: LifeAreaId): LifeAreaId {
  return typeof category === 'string' && LIFE_AREA_IDS.includes(category as LifeAreaId)
    ? (category as LifeAreaId)
    : fallback
}

function normalizeDeadline(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function sanitizeDraft(candidate: Partial<DraftAnalysis>, rawText: string): DraftAnalysis {
  const fallback = fallbackAnalyzeTodo(rawText)

  return {
    title: candidate.title?.trim() || fallback.title,
    category: normalizeCategory(candidate.category, fallback.category),
    deadline: normalizeDeadline(candidate.deadline) ?? fallback.deadline,
    urgency: typeof candidate.urgency === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.urgency))) : fallback.urgency,
    effort: typeof candidate.effort === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.effort))) : fallback.effort,
    stress: typeof candidate.stress === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.stress))) : fallback.stress,
    nextStep: candidate.nextStep?.trim() || fallback.nextStep,
    subtasks: Array.isArray(candidate.subtasks) ? candidate.subtasks.filter(Boolean).slice(0, 4) : fallback.subtasks,
    confidence: candidate.confidence || 'medium',
    source: 'llm',
  }
}

export async function analyzeTodo(rawText: string, settings: AppSettings): Promise<DraftAnalysis> {
  const fallback = fallbackAnalyzeTodo(rawText)

  const parsed = await requestJson(
    settings,
    'You classify short todo items for an ADHD-friendly dashboard. Return valid JSON only with keys: title, category, deadline, urgency, effort, stress, nextStep, subtasks, confidence. Categories: finances, education, food, activity, home, admin, socialRest. deadline must be YYYY-MM-DD or null. urgency/effort/stress are integers 1-5.',
    rawText,
  )

  if (!parsed || typeof parsed !== 'object') {
    return fallback
  }

  return sanitizeDraft(parsed as Partial<DraftAnalysis>, rawText)
}

export async function generateDemoTodosViaLLM(settings: AppSettings): Promise<TodoItem[]> {
  const parsed = await requestJson(
    settings,
    'Create realistic ADHD-friendly todo data across different life areas. Return JSON object with key todos as an array of 8 todos. For each todo include: rawText, title, category, deadline, urgency, effort, stress, nextStep, subtasks, confidence, status. Categories: finances, education, food, activity, home, admin, socialRest. status is open or done. deadline must be YYYY-MM-DD or null.',
    'Generate a balanced set with mixed urgency and at least one item for each major life domain.',
  )

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { todos?: unknown[] }).todos)) {
    return []
  }

  const now = new Date().toISOString()
  const todos = (parsed as { todos: Array<Partial<TodoItem> & { rawText?: string }> }).todos

  return todos.slice(0, 12).map((item) => {
    const seedText = item.rawText?.trim() || item.title?.trim() || 'Untitled task'
    const draft = sanitizeDraft(
      {
        title: item.title,
        category: item.category,
        deadline: item.deadline,
        urgency: item.urgency,
        effort: item.effort,
        stress: item.stress,
        nextStep: item.nextStep,
        subtasks: item.subtasks,
        confidence: item.confidence,
      },
      seedText,
    )

    const isDone = item.status === 'done'
    return {
      id: '',
      rawText: seedText,
      title: draft.title,
      category: draft.category,
      createdAt: now,
      deadline: draft.deadline,
      status: isDone ? 'done' : 'open',
      completedAt: isDone ? now : null,
      urgency: draft.urgency,
      effort: draft.effort,
      stress: draft.stress,
      nextStep: draft.nextStep,
      subtasks: draft.subtasks,
      confidence: draft.confidence,
      source: 'llm',
    } satisfies TodoItem
  })
}

export async function adjustTodoWithLLM(
  todo: TodoItem,
  instruction: string,
  settings: AppSettings,
): Promise<Partial<TodoItem> | null> {
  const parsed = await requestJson(
    settings,
    'You are a todo adjustment assistant. Return JSON with only keys you want to update from: title, deadline, category, urgency, effort, stress, nextStep, subtasks, status. category must be one of finances, education, food, activity, home, admin, socialRest. deadline must be YYYY-MM-DD or null. urgency/effort/stress integers 1-5. status open or done.',
    `Current todo:\n${JSON.stringify(todo)}\n\nUser request:\n${instruction}`,
  )

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const candidate = parsed as Partial<TodoItem>
  return {
    title: candidate.title?.trim() || undefined,
    deadline: normalizeDeadline(candidate.deadline) ?? undefined,
    category: normalizeCategory(candidate.category, todo.category),
    urgency: typeof candidate.urgency === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.urgency))) : undefined,
    effort: typeof candidate.effort === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.effort))) : undefined,
    stress: typeof candidate.stress === 'number' ? Math.min(5, Math.max(1, Math.round(candidate.stress))) : undefined,
    nextStep: typeof candidate.nextStep === 'string' ? candidate.nextStep.trim() : undefined,
    subtasks: Array.isArray(candidate.subtasks) ? candidate.subtasks.filter(Boolean).slice(0, 6) : undefined,
    status: candidate.status === 'done' || candidate.status === 'open' ? candidate.status : undefined,
  }
}
