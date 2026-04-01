import { daysUntil } from './dateParsing'
import { getScoreForArea } from './scoring'
import type { LifeAreaScore, PrioritizedTodo, ReminderItem, TodoItem } from '../types/domain'

function dueWeight(todo: TodoItem) {
  const days = daysUntil(todo.deadline)

  if (days === null) {
    return 8
  }

  if (days < 0) {
    return 90 + Math.abs(days) * 8
  }

  if (days === 0) {
    return 70
  }

  if (days <= 2) {
    return 45 - days * 5
  }

  return 12
}

export function prioritizeTodos(todos: TodoItem[], scores: LifeAreaScore[]): PrioritizedTodo[] {
  return todos
    .filter((todo) => todo.status === 'open')
    .map((todo) => {
      const healthPenalty = 100 - getScoreForArea(scores, todo.category)
      const priorityScore = dueWeight(todo) + healthPenalty * 0.7 + todo.urgency * 11 + todo.stress * 7 + todo.effort * 2
      const reason =
        dueWeight(todo) >= 70
          ? 'Deadline pressure is high.'
          : healthPenalty > 40
            ? 'This life area is already under strain.'
            : 'A small push here prevents backlog growth.'

      return {
        ...todo,
        priorityScore,
        reason,
      }
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
}

export function buildReminders(todos: PrioritizedTodo[]): ReminderItem[] {
  return todos.slice(0, 4).map((todo) => ({
    todoId: todo.id,
    title: todo.title,
    category: todo.category,
    reason: todo.reason,
    scoreImpact: Math.round(todo.priorityScore),
  }))
}
