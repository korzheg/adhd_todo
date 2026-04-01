import type { TodoItem } from '../types/domain'
import { generateId } from './id'

interface DemoTemplate {
  rawText: string
  title: string
  category: TodoItem['category']
  deadlineOffsetDays: number | null
  urgency: number
  effort: number
  stress: number
  nextStep: string
  subtasks: string[]
  confidence: TodoItem['confidence']
  status: TodoItem['status']
}

const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    rawText: 'Pay electricity bill tomorrow',
    title: 'Pay electricity bill',
    category: 'finances',
    deadlineOffsetDays: 1,
    urgency: 5,
    effort: 2,
    stress: 5,
    nextStep: 'Open the banking app and queue the payment.',
    subtasks: [],
    confidence: 'high',
    status: 'open',
  },
  {
    rawText: 'Finish machine learning reading in 2 days',
    title: 'Finish machine learning reading',
    category: 'education',
    deadlineOffsetDays: 2,
    urgency: 4,
    effort: 4,
    stress: 4,
    nextStep: 'Read for 20 minutes and highlight the first section.',
    subtasks: ['Read section one', 'Capture three notes'],
    confidence: 'medium',
    status: 'open',
  },
  {
    rawText: 'Buy groceries today',
    title: 'Buy groceries',
    category: 'food',
    deadlineOffsetDays: 0,
    urgency: 4,
    effort: 2,
    stress: 3,
    nextStep: 'Order the basics or walk to the nearest store.',
    subtasks: [],
    confidence: 'high',
    status: 'open',
  },
  {
    rawText: 'Walk for 20 minutes',
    title: 'Walk for 20 minutes',
    category: 'activity',
    deadlineOffsetDays: null,
    urgency: 2,
    effort: 1,
    stress: 1,
    nextStep: 'Put shoes by the door for tomorrow.',
    subtasks: [],
    confidence: 'medium',
    status: 'done',
  },
]

function isoDateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function createDemoTodos(): TodoItem[] {
  const now = new Date().toISOString()
  return DEMO_TEMPLATES.map((template) => ({
    id: generateId(),
    rawText: template.rawText,
    title: template.title,
    category: template.category,
    createdAt: now,
    deadline: template.deadlineOffsetDays === null ? null : isoDateAfterDays(template.deadlineOffsetDays),
    status: template.status,
    completedAt: template.status === 'done' ? now : null,
    urgency: template.urgency,
    effort: template.effort,
    stress: template.stress,
    nextStep: template.nextStep,
    subtasks: template.subtasks,
    confidence: template.confidence,
    source: 'fallback',
  }))
}
