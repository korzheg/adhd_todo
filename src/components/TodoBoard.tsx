import type { PrioritizedTodo, TodoItem } from '../types/domain'
import { daysUntil } from '../lib/dateParsing'

function isPrioritizedTodo(todo: TodoItem | PrioritizedTodo): todo is PrioritizedTodo {
  return 'priorityScore' in todo && typeof todo.priorityScore === 'number'
}

interface TodoBoardProps {
  todos: TodoItem[]
  prioritizedTodos: PrioritizedTodo[]
  onToggle: (todoId: string) => void
  onLoadDemo: () => void
  loadingDemo?: boolean
}

export function TodoBoard({ todos, prioritizedTodos, onToggle, onLoadDemo, loadingDemo = false }: TodoBoardProps) {
  const visibleTodos = prioritizedTodos.length > 0 ? prioritizedTodos : todos

  return (
    <section>
      <div className="todo-header">
        <h2>Queue ({todos.filter((t) => t.status === 'open').length} open)</h2>
        <button className="demo-btn" disabled={loadingDemo} onClick={onLoadDemo} type="button">
          {loadingDemo ? 'Generating...' : 'Load demo'}
        </button>
      </div>

      {visibleTodos.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No tasks yet. Type something above or load demo data.</p>
        </div>
      ) : (
        <div className="todo-list">
          {visibleTodos.map((todo) => {
            const detail = isPrioritizedTodo(todo) ? todo.reason : todo.nextStep ?? ''
            const days = daysUntil(todo.deadline)
            const isOverdue = days !== null && days < 0
            const isSoon = days !== null && days >= 0 && days <= 2

            return (
              <article className={`todo-card${todo.status === 'done' ? ' is-done' : ''}`} key={todo.id}>
                <button
                  className="todo-toggle"
                  onClick={() => onToggle(todo.id)}
                  type="button"
                  aria-label={todo.status === 'done' ? 'Mark undone' : 'Mark done'}
                >
                  {todo.status === 'done' ? '✓' : ''}
                </button>
                <div className="todo-card__body">
                  <p className="todo-card__title">{todo.title}</p>
                  {detail && <p className="todo-card__sub">{detail}</p>}
                </div>
                <div className="todo-card__tags">
                  <span className="tag">{todo.category}</span>
                  {isOverdue && <span className="tag is-overdue">Overdue</span>}
                  {isSoon && !isOverdue && <span className="tag is-soon">Due soon</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
