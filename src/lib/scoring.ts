import { daysUntil } from './dateParsing'
import { LIFE_AREAS, type HealthState, type LifeAreaId, type LifeAreaScore, type TodoItem } from '../types/domain'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getState(score: number): HealthState {
  if (score >= 75) {
    return 'healthy'
  }

  if (score >= 45) {
    return 'warning'
  }

  return 'critical'
}

export function calculateLifeAreaScores(todos: TodoItem[], now = new Date()): LifeAreaScore[] {
  return LIFE_AREAS.map((area) => {
    const items = todos.filter((todo) => todo.category === area.id)
    const openItems = items.filter((todo) => todo.status === 'open')
    const completedItems = items.filter((todo) => todo.status === 'done')
    const overdueCount = openItems.filter((todo) => {
      const days = daysUntil(todo.deadline, now)
      return days !== null && days < 0
    }).length
    const dueSoonCount = openItems.filter((todo) => {
      const days = daysUntil(todo.deadline, now)
      return days !== null && days >= 0 && days <= 2
    }).length
    const stressLoad = openItems.reduce((sum, todo) => sum + todo.stress, 0)
    const effortLoad = openItems.reduce((sum, todo) => sum + todo.effort, 0)
    const completedRecovery = completedItems.length * 3
    const pressure = clamp(overdueCount * 26 + dueSoonCount * 12 + stressLoad * 2 + effortLoad - completedRecovery, 0, 100)
    const score = clamp(100 - pressure - openItems.length * 4 + completedRecovery, 6, 100)
    const state = getState(score)
    const message =
      state === 'healthy'
        ? area.healthyMessage
        : state === 'warning'
          ? area.warningMessage
          : area.criticalMessage

    return {
      category: area.id,
      label: area.label,
      icon: area.icon,
      score,
      state,
      openCount: openItems.length,
      completedCount: completedItems.length,
      overdueCount,
      dueSoonCount,
      pressure,
      message,
    }
  })
}

export function calculateOverallHealth(scores: LifeAreaScore[], todos: TodoItem[]) {
  if (scores.length === 0) {
    return 100
  }

  const average = scores.reduce((sum, score) => sum + score.score, 0) / scores.length
  const openCount = todos.filter((todo) => todo.status === 'open').length
  const overloadPenalty = Math.max(0, openCount - 8) * 2.5
  return clamp(Math.round(average - overloadPenalty), 0, 100)
}

export function getScoreForArea(scores: LifeAreaScore[], category: LifeAreaId) {
  return scores.find((score) => score.category === category)?.score ?? 100
}
