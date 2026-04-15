import { DEFAULT_SETTINGS, type StoredState } from '../types/domain'

const STORAGE_KEY = 'adhd-dashboard-state'

export function loadState(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        todos: [],
        settings: DEFAULT_SETTINGS,
        onboardingCompleted: false,
      }
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      todos: parsed.todos ?? [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      },
      onboardingCompleted: parsed.onboardingCompleted ?? Boolean(parsed.settings),
    }
  } catch {
    return {
      todos: [],
      settings: DEFAULT_SETTINGS,
      onboardingCompleted: false,
    }
  }
}

export function saveState(state: StoredState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
