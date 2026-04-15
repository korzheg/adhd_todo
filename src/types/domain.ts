export type LifeAreaId =
  | 'finances'
  | 'education'
  | 'food'
  | 'activity'
  | 'home'
  | 'admin'
  | 'socialRest'

export type HealthState = 'healthy' | 'warning' | 'critical'

export interface LifeAreaDefinition {
  id: LifeAreaId
  label: string
  icon: string
  description: string
  healthyMessage: string
  warningMessage: string
  criticalMessage: string
  keywords: string[]
}

export interface TodoItem {
  id: string
  rawText: string
  title: string
  category: LifeAreaId
  createdAt: string
  deadline: string | null
  status: 'open' | 'done'
  completedAt: string | null
  urgency: number
  effort: number
  stress: number
  nextStep: string | null
  subtasks: string[]
  confidence: 'high' | 'medium' | 'low'
  source: 'fallback' | 'llm'
}

export interface DraftAnalysis {
  title: string
  category: LifeAreaId
  deadline: string | null
  urgency: number
  effort: number
  stress: number
  nextStep: string | null
  subtasks: string[]
  confidence: 'high' | 'medium' | 'low'
  source: 'fallback' | 'llm'
}

export interface LifeAreaScore {
  category: LifeAreaId
  label: string
  icon: string
  score: number
  state: HealthState
  openCount: number
  completedCount: number
  overdueCount: number
  dueSoonCount: number
  pressure: number
  message: string
}

export interface ReminderItem {
  todoId: string
  title: string
  category: LifeAreaId
  reason: string
  scoreImpact: number
}

export interface PrioritizedTodo extends TodoItem {
  priorityScore: number
  reason: string
}

export interface AppSettings {
  apiKey: string
  endpoint: string
  backendUrl: string
  model: string
  llmEnabled: boolean
  theme: 'dark' | 'light'
  syncEnabled: boolean
  syncKey: string
  reduceMotion: boolean
  intensity: 'calm' | 'dramatic'
}

export interface StoredState {
  todos: TodoItem[]
  settings: AppSettings
}

export const LIFE_AREAS: LifeAreaDefinition[] = [
  {
    id: 'finances',
    label: 'Finances',
    icon: '¤',
    description: 'Bills, budgets, income, and money admin.',
    healthyMessage: 'Money lane stable. Keep the streak tidy.',
    warningMessage: 'Budget pressure is creeping in. Reduce uncertainty.',
    criticalMessage: 'Finance stress is active. Act before the damage compounds.',
    keywords: ['bill', 'rent', 'pay', 'invoice', 'bank', 'budget', 'tax', 'money'],
  },
  {
    id: 'education',
    label: 'Education',
    icon: '◫',
    description: 'Study, classes, reading, and skill-building.',
    healthyMessage: 'Learning loop is in motion.',
    warningMessage: 'Study load is slipping. Break the next move down.',
    criticalMessage: 'Education bar is bleeding time. Rescue the closest deadline now.',
    keywords: ['study', 'course', 'exam', 'read', 'homework', 'project', 'class', 'learn'],
  },
  {
    id: 'food',
    label: 'Food',
    icon: '◌',
    description: 'Groceries, meals, hydration, and nutrition prep.',
    healthyMessage: 'Fuel reserves look solid.',
    warningMessage: 'Meal support is getting thin. Restock before it snowballs.',
    criticalMessage: 'Food support is low. Prioritize eating and supplies.',
    keywords: ['cook', 'groceries', 'meal', 'food', 'eat', 'snack', 'water'],
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: '▲',
    description: 'Movement, exercise, walks, and physical reset.',
    healthyMessage: 'Body systems look charged.',
    warningMessage: 'Movement has dropped. A short session will recover momentum.',
    criticalMessage: 'Activity bar is drained. Start with the smallest possible motion.',
    keywords: ['walk', 'gym', 'run', 'exercise', 'stretch', 'movement', 'workout'],
  },
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
    description: 'Cleaning, maintenance, errands, and household stability.',
    healthyMessage: 'Base is under control.',
    warningMessage: 'Home friction is rising. Clear one visible blocker.',
    criticalMessage: 'Home state is noisy and costly. Remove one urgent point of chaos.',
    keywords: ['clean', 'laundry', 'kitchen', 'home', 'fix', 'repair', 'trash'],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '▤',
    description: 'Appointments, forms, emails, and logistics.',
    healthyMessage: 'Admin backlog is contained.',
    warningMessage: 'Loose ends are multiplying. Close one thread.',
    criticalMessage: 'Admin debt is spiking. Clear the most time-sensitive paper cut.',
    keywords: ['email', 'appointment', 'call', 'form', 'document', 'schedule', 'reply'],
  },
  {
    id: 'socialRest',
    label: 'Social / Rest',
    icon: '♡',
    description: 'Relationships, downtime, decompression, and sleep support.',
    healthyMessage: 'Recovery lane feels protected.',
    warningMessage: 'Rest and connection are thinning out.',
    criticalMessage: 'Recovery bar is near empty. Protect rest before adding more load.',
    keywords: ['sleep', 'rest', 'friend', 'call mom', 'break', 'recharge', 'relax'],
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  backendUrl: 'https://pulseboard-backend-yk8z.onrender.com/api',
  model: 'gpt-4.1-mini',
  llmEnabled: true,
  theme: 'light',
  syncEnabled: false,
  syncKey: '',
  reduceMotion: false,
  intensity: 'dramatic',
}
