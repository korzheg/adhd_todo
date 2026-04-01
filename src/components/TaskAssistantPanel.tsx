import { useMemo, useState } from 'react'
import type { TodoItem } from '../types/domain'

interface TaskAssistantPanelProps {
  todos: TodoItem[]
  busy: boolean
  onApply: (todoId: string, instruction: string) => Promise<boolean>
}

export function TaskAssistantPanel({ todos, busy, onApply }: TaskAssistantPanelProps) {
  const [selectedTodoId, setSelectedTodoId] = useState('')
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState('')

  const openTodos = useMemo(() => todos.filter((todo) => todo.status === 'open'), [todos])

  async function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const todoId = selectedTodoId.trim()
    const prompt = instruction.trim()
    if (!todoId || !prompt) return

    const ok = await onApply(todoId, prompt)
    setStatus(ok ? 'Updated task using LLM.' : 'Could not apply change. Check settings/API key.')
    if (ok) {
      setInstruction('')
    }
  }

  return (
    <section className="assistant-panel card">
      <div className="assistant-panel__head">
        <h2>Task copilot</h2>
        <p>Ask to reschedule, set deadline, split task, or lower effort.</p>
      </div>
      <form className="assistant-form" onSubmit={handleApply}>
        <select
          className="assistant-select"
          onChange={(event) => setSelectedTodoId(event.target.value)}
          value={selectedTodoId}
        >
          <option value="">Select an open task</option>
          {openTodos.map((todo) => (
            <option key={todo.id} value={todo.id}>
              {todo.title}
            </option>
          ))}
        </select>
        <input
          className="assistant-input"
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Move this to Friday 18:00 and split into 3 steps"
          value={instruction}
        />
        <button className="assistant-btn" disabled={busy || !selectedTodoId || !instruction.trim()} type="submit">
          {busy ? 'Applying...' : 'Apply'}
        </button>
      </form>
      {status && <p className="assistant-status">{status}</p>}
    </section>
  )
}
