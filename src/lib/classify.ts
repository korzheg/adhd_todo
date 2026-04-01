import { LIFE_AREAS, type DraftAnalysis, type LifeAreaId } from '../types/domain'
import { parseDeadline } from './dateParsing'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function inferCategory(rawText: string): LifeAreaId {
  const normalized = rawText.toLowerCase()

  const ranked = LIFE_AREAS.map((area) => ({
    id: area.id,
    score: area.keywords.reduce((sum, keyword) => {
      return normalized.includes(keyword) ? sum + 1 : sum
    }, 0),
  })).sort((left, right) => right.score - left.score)

  return ranked[0].score > 0 ? ranked[0].id : 'admin'
}

function inferUrgency(rawText: string, deadline: string | null) {
  const normalized = rawText.toLowerCase()
  let urgency = deadline ? 3 : 2

  if (/urgent|asap|immediately|tonight/.test(normalized)) {
    urgency += 2
  }

  if (/later|someday|eventually/.test(normalized)) {
    urgency -= 1
  }

  return clamp(urgency, 1, 5)
}

function inferEffort(rawText: string) {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length
  return clamp(Math.round(words / 4), 1, 5)
}

function inferStress(rawText: string, urgency: number) {
  const normalized = rawText.toLowerCase()
  let stress = urgency

  if (/avoid|late|overdue|forgot|panic|exam|bill/.test(normalized)) {
    stress += 1
  }

  return clamp(stress, 1, 5)
}

function inferNextStep(rawText: string) {
  const verbs = ['email', 'call', 'pay', 'book', 'schedule', 'buy', 'write', 'read', 'clean']
  const lower = rawText.toLowerCase()
  const matchedVerb = verbs.find((verb) => lower.includes(verb))

  if (matchedVerb) {
    return `${matchedVerb[0].toUpperCase()}${matchedVerb.slice(1)} the first concrete piece.`
  }

  return 'Shrink this into a 10-minute starting action.'
}

export function fallbackAnalyzeTodo(rawText: string): DraftAnalysis {
  const deadline = parseDeadline(rawText)
  const urgency = inferUrgency(rawText, deadline)

  return {
    title: rawText.trim(),
    category: inferCategory(rawText),
    deadline,
    urgency,
    effort: inferEffort(rawText),
    stress: inferStress(rawText, urgency),
    nextStep: inferNextStep(rawText),
    subtasks: [],
    confidence: deadline ? 'medium' : 'low',
    source: 'fallback',
  }
}
