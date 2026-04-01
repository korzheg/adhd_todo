import fs from 'node:fs/promises'
import path from 'node:path'

const DB_PATH = path.resolve(process.cwd(), 'server/tasks-db.json')

async function ensureDb() {
  try {
    await fs.access(DB_PATH)
  } catch {
    const seed = { tasks: [] }
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), 'utf8')
  }
}

async function readDb() {
  await ensureDb()
  const raw = await fs.readFile(DB_PATH, 'utf8')
  return JSON.parse(raw)
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listTasks(chatId) {
  const db = await readDb()
  return db.tasks.filter((task) => task.chatId === chatId)
}

export async function addTask(chatId, input) {
  const db = await readDb()
  const task = {
    id: makeId(),
    chatId,
    title: input.title,
    deadline: input.deadline ?? null,
    reminderAt: input.reminderAt ?? null,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  db.tasks.push(task)
  await writeDb(db)
  return task
}

export async function updateTask(chatId, taskId, patch) {
  const db = await readDb()
  const idx = db.tasks.findIndex((task) => task.chatId === chatId && task.id === taskId)
  if (idx === -1) return null
  db.tasks[idx] = { ...db.tasks[idx], ...patch }
  await writeDb(db)
  return db.tasks[idx]
}

export async function completeTaskByTitle(chatId, titleContains) {
  const db = await readDb()
  const needle = titleContains.trim().toLowerCase()
  const found = db.tasks.find((task) => task.chatId === chatId && !task.completed && task.title.toLowerCase().includes(needle))
  if (!found) return null
  found.completed = true
  found.completedAt = new Date().toISOString()
  await writeDb(db)
  return found
}

export async function listDueReminders(nowIso) {
  const db = await readDb()
  return db.tasks.filter((task) => !task.completed && task.reminderAt && task.reminderAt <= nowIso && !task.remindedAt)
}

export async function markReminded(taskId) {
  const db = await readDb()
  const idx = db.tasks.findIndex((task) => task.id === taskId)
  if (idx === -1) return
  db.tasks[idx].remindedAt = new Date().toISOString()
  await writeDb(db)
}
