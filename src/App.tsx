import { useEffect, useRef, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { FirstRunSetup } from './components/FirstRunSetup'
import { RealtimeVoicePanel } from './components/RealtimeVoicePanel'
import { ReminderPanel } from './components/ReminderPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { TaskAssistantPanel } from './components/TaskAssistantPanel'
import { TodoBoard } from './components/TodoBoard'
import { TodoInput } from './components/TodoInput'
import { createDemoTodos } from './lib/demo'
import { generateId } from './lib/id'
import { adjustTodoWithLLM, analyzeTodo, generateDemoTodosViaLLM } from './lib/llm'
import { buildReminders, prioritizeTodos } from './lib/prioritize'
import { calculateLifeAreaScores, calculateOverallHealth } from './lib/scoring'
import { loadState, saveState } from './lib/storage'
import type { AppSettings, DraftAnalysis, TodoItem } from './types/domain'
import './App.css'

type View = 'tasks' | 'dashboard' | 'settings'

function App() {
  const [{ todos, settings, onboardingCompleted }, setState] = useState(loadState)
  const [preview, setPreview] = useState<DraftAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplyingAssistant, setIsApplyingAssistant] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [view, setView] = useState<View>('tasks')
  const latestTodosRef = useRef(todos)
  const lastSyncedSnapshotRef = useRef('')
  const lastRemoteUpdatedAtRef = useRef('')

  useEffect(() => {
    saveState({ todos, settings, onboardingCompleted })
  }, [onboardingCompleted, settings, todos])

  useEffect(() => {
    latestTodosRef.current = todos
  }, [todos])

  const scores = calculateLifeAreaScores(todos)
  const overallHealth = calculateOverallHealth(scores, todos)
  const prioritizedTodos = prioritizeTodos(todos, scores)
  const reminders = buildReminders(prioritizedTodos)
  const healthState = overallHealth >= 75 ? 'healthy' : overallHealth >= 45 ? 'warning' : 'critical'

  useEffect(() => {
    document.body.classList.remove('health-good', 'health-warning', 'health-critical')
    if (healthState === 'healthy') document.body.classList.add('health-good')
    else if (healthState === 'warning') document.body.classList.add('health-warning')
    else document.body.classList.add('health-critical')
  }, [healthState])

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light')
    document.body.classList.add(settings.theme === 'light' ? 'theme-light' : 'theme-dark')
  }, [settings.theme])

  function updateSettings(nextSettings: AppSettings) {
    setState((current) => ({ ...current, settings: nextSettings }))
  }

  function handleCompleteOnboarding(apiKey: string) {
    setState((current) => ({
      ...current,
      onboardingCompleted: true,
      settings: {
        ...current.settings,
        apiKey,
      },
    }))
  }

  async function handleSubmit(rawText: string) {
    setIsAnalyzing(true)
    try {
      const analysis = await analyzeTodo(rawText, settings)
      setPreview(analysis)
      setState((current) => ({
        ...current,
        todos: [
            {
              id: generateId(),
            rawText,
            title: analysis.title,
            category: analysis.category,
            createdAt: new Date().toISOString(),
            deadline: analysis.deadline,
            status: 'open' as const,
            completedAt: null,
            urgency: analysis.urgency,
            effort: analysis.effort,
            stress: analysis.stress,
            nextStep: analysis.nextStep,
            subtasks: analysis.subtasks,
            confidence: analysis.confidence,
            source: analysis.source,
          },
          ...current.todos,
        ],
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleAddTaskFromVoice(title: string, deadline: string | null) {
    const cleaned = title.trim()
    if (!cleaned) {
      return { ok: false, error: 'Empty title' }
    }

    const taskId = generateId()
    const analysis = await analyzeTodo(cleaned, settings)
    setState((current) => ({
      ...current,
      todos: [
        {
          id: taskId,
          rawText: cleaned,
          title: cleaned,
          category: analysis.category,
          createdAt: new Date().toISOString(),
          deadline: deadline ?? analysis.deadline,
          status: 'open' as const,
          completedAt: null,
          urgency: analysis.urgency,
          effort: analysis.effort,
          stress: analysis.stress,
          nextStep: analysis.nextStep,
          subtasks: analysis.subtasks,
          confidence: analysis.confidence,
          source: analysis.source,
        },
        ...current.todos,
      ],
    }))

    return { ok: true, taskId, title: cleaned }
  }

  async function handleCompleteTaskFromVoice(taskId: string) {
    const target = todos.find((todo) => todo.id === taskId)
    if (!target) {
      return { ok: false, error: 'Task not found' }
    }
    if (target.status === 'done') {
      return { ok: true, alreadyDone: true, taskId }
    }

    setState((current) => ({
      ...current,
      todos: current.todos.map((todo) =>
        todo.id === taskId
          ? { ...todo, status: 'done' as const, completedAt: new Date().toISOString() }
          : todo,
      ),
    }))
    return { ok: true, taskId }
  }

  async function handleUpdateTaskFromVoice(taskId: string, patch: Partial<TodoItem>) {
    const target = todos.find((todo) => todo.id === taskId)
    if (!target) {
      return { ok: false, error: 'Task not found' }
    }

    setState((current) => ({
      ...current,
      todos: current.todos.map((todo) => {
        if (todo.id !== taskId) return todo
        return {
          ...todo,
          title: typeof patch.title === 'string' ? patch.title : todo.title,
          deadline:
            typeof patch.deadline === 'string' || patch.deadline === null
              ? (patch.deadline as string | null)
              : todo.deadline,
          nextStep: typeof patch.nextStep === 'string' ? patch.nextStep : todo.nextStep,
        }
      }),
    }))

    return { ok: true, taskId }
  }

  function handleToggleTodo(todoId: string) {
    setState((current) => ({
      ...current,
      todos: current.todos.map((todo) => {
        if (todo.id !== todoId) return todo
        return todo.status === 'open'
          ? { ...todo, status: 'done' as const, completedAt: new Date().toISOString() }
          : { ...todo, status: 'open' as const, completedAt: null }
      }),
    }))
  }

  async function handleLoadDemo() {
    setIsLoadingDemo(true)
    try {
      const fromLLM = await generateDemoTodosViaLLM(settings)
      const seeded = fromLLM.length > 0 ? fromLLM : createDemoTodos()
      const now = new Date().toISOString()

      setState((current) => ({
        ...current,
        todos: [
          ...current.todos,
          ...seeded.map((todo) => ({
            ...todo,
            id: generateId(),
            createdAt: todo.createdAt || now,
          })),
        ],
      }))
    } finally {
      setIsLoadingDemo(false)
    }
  }

  async function handlePullSync() {
    if (!settings.syncEnabled || !settings.syncKey.trim()) {
      setSyncStatus('Enable sync and set sync key first.')
      return
    }

    setSyncBusy(true)
    setSyncStatus('Pulling...')
    try {
      const base = settings.backendUrl.replace(/\/$/, '')
      const response = await fetch(`${base}/state/load?key=${encodeURIComponent(settings.syncKey.trim())}`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      const payload = (await response.json()) as { state?: { todos?: unknown[] } }
      const remoteTodos = Array.isArray(payload.state?.todos) ? payload.state?.todos : []
      lastSyncedSnapshotRef.current = JSON.stringify(remoteTodos)
      setState((current) => ({
        ...current,
        todos: remoteTodos.length > 0 ? (remoteTodos as typeof current.todos) : current.todos,
      }))
      setSyncStatus(remoteTodos.length > 0 ? `Pulled ${remoteTodos.length} tasks.` : 'No remote tasks found for this key.')
    } catch (error) {
      setSyncStatus(`Pull failed: ${String(error)}`)
    } finally {
      setSyncBusy(false)
    }
  }

  async function handlePushSync() {
    if (!settings.syncEnabled || !settings.syncKey.trim()) {
      setSyncStatus('Enable sync and set sync key first.')
      return
    }

    setSyncBusy(true)
    setSyncStatus('Pushing...')
    try {
      const base = settings.backendUrl.replace(/\/$/, '')
      const response = await fetch(`${base}/state/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: settings.syncKey.trim(),
          todos,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const payload = (await response.json()) as { state?: { updatedAt?: string } }
      lastSyncedSnapshotRef.current = JSON.stringify(todos)
      lastRemoteUpdatedAtRef.current = payload.state?.updatedAt ?? lastRemoteUpdatedAtRef.current
      setSyncStatus(`Pushed ${todos.length} tasks.`)
    } catch (error) {
      setSyncStatus(`Push failed: ${String(error)}`)
    } finally {
      setSyncBusy(false)
    }
  }

  useEffect(() => {
    if (!settings.syncEnabled || !settings.syncKey.trim()) {
      return
    }

    const snapshot = JSON.stringify(todos)
    if (snapshot === lastSyncedSnapshotRef.current) {
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const base = settings.backendUrl.replace(/\/$/, '')
        const response = await fetch(`${base}/state/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: settings.syncKey.trim(),
            todos: latestTodosRef.current,
          }),
        })
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as { state?: { updatedAt?: string } }
        lastSyncedSnapshotRef.current = JSON.stringify(latestTodosRef.current)
        lastRemoteUpdatedAtRef.current = payload.state?.updatedAt ?? lastRemoteUpdatedAtRef.current
        setSyncStatus(`Auto-synced ${latestTodosRef.current.length} tasks.`)
      } catch {
        setSyncStatus('Auto-sync waiting for backend...')
      }
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [settings.backendUrl, settings.syncEnabled, settings.syncKey, todos])

  useEffect(() => {
    if (!settings.syncEnabled || !settings.syncKey.trim()) {
      return
    }

    const base = settings.backendUrl.replace(/\/$/, '')
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${base}/state/load?key=${encodeURIComponent(settings.syncKey.trim())}`)
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as { state?: { todos?: TodoItem[]; updatedAt?: string } }
        const remoteState = payload.state
        if (!remoteState?.updatedAt || remoteState.updatedAt === lastRemoteUpdatedAtRef.current) {
          return
        }

        const remoteSnapshot = JSON.stringify(remoteState.todos ?? [])
        if (remoteSnapshot === JSON.stringify(latestTodosRef.current)) {
          lastRemoteUpdatedAtRef.current = remoteState.updatedAt
          lastSyncedSnapshotRef.current = remoteSnapshot
          return
        }

        lastRemoteUpdatedAtRef.current = remoteState.updatedAt
        lastSyncedSnapshotRef.current = remoteSnapshot
        setState((current) => ({
          ...current,
          todos: Array.isArray(remoteState.todos) ? remoteState.todos : current.todos,
        }))
        setSyncStatus('Auto-pulled latest tasks from cloud.')
      } catch {
        // keep silent during polling
      }
    }, 8000)

    return () => window.clearInterval(timer)
  }, [settings.backendUrl, settings.syncEnabled, settings.syncKey])

  async function handleAssistantApply(todoId: string, instruction: string) {
    const todo = todos.find((item) => item.id === todoId)
    if (!todo) {
      return false
    }

    setIsApplyingAssistant(true)
    try {
      const patch = await adjustTodoWithLLM(todo, instruction, settings)
      if (!patch) {
        return false
      }

      setState((current) => ({
        ...current,
        todos: current.todos.map((item) => {
          if (item.id !== todoId) return item

          const nextStatus = patch.status ?? item.status
          return {
            ...item,
            ...patch,
            status: nextStatus,
            completedAt:
              nextStatus === 'done'
                ? item.completedAt ?? new Date().toISOString()
                : null,
          }
        }),
      }))
      return true
    } finally {
      setIsApplyingAssistant(false)
    }
  }

  if (!onboardingCompleted) {
    return (
      <div className={`app theme-${settings.theme} ${settings.reduceMotion ? 'reduced-motion' : ''}`}>
        <FirstRunSetup initialValue={settings.apiKey} onSubmit={handleCompleteOnboarding} />
      </div>
    )
  }

  return (
    <div className={`app theme-${settings.theme} ${settings.reduceMotion ? 'reduced-motion' : ''}`}>
      {/* Post-processing vignette */}
      <div
        className={`vignette-overlay${healthState === 'warning' ? ' is-warning' : ''}${healthState === 'critical' ? ' is-critical' : ''}`}
      />

      {/* Sticky top bar */}
      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="brand-icon">♥</span>
          <span>Pulseboard</span>
        </div>
        <div className={`top-bar__health is-${healthState}`}>
          <span>{healthState === 'healthy' ? '❤️' : healthState === 'warning' ? '🧡' : '🖤'}</span>
          <span>{overallHealth}%</span>
        </div>
      </header>

      {/* Views */}
      {view === 'tasks' && (
        <div className="tasks-view">
          <TodoInput isAnalyzing={isAnalyzing} onSubmit={handleSubmit} preview={preview} />
          <RealtimeVoicePanel
            onAddTask={handleAddTaskFromVoice}
            onCompleteTask={handleCompleteTaskFromVoice}
            onUpdateTask={handleUpdateTaskFromVoice}
            settings={settings}
            todos={todos}
          />
          <ReminderPanel reminders={reminders} />
          <TodoBoard
            onLoadDemo={handleLoadDemo}
            onToggle={handleToggleTodo}
            prioritizedTodos={prioritizedTodos}
            todos={todos}
            loadingDemo={isLoadingDemo}
          />
        </div>
      )}

      {view === 'dashboard' && (
        <Dashboard overallHealth={overallHealth} scores={scores} />
      )}

      {view === 'settings' && (
        <div className="settings-view">
          <SettingsPanel
            onChange={updateSettings}
            onPullSync={handlePullSync}
            onPushSync={handlePushSync}
            settings={settings}
            syncBusy={syncBusy}
            syncStatus={syncStatus}
          />
          <TaskAssistantPanel
            busy={isApplyingAssistant}
            onApply={handleAssistantApply}
            todos={todos}
          />
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')} type="button">
          <span className="nav-icon">⚡</span>
          <span>Tasks</span>
        </button>
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')} type="button">
          <span className="nav-icon">♥</span>
          <span>Health</span>
        </button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')} type="button">
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  )
}

export default App
