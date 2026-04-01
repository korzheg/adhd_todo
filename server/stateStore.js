import fs from 'node:fs/promises'
import path from 'node:path'

const DB_PATH = path.resolve(process.cwd(), 'server/shared-state-db.json')

async function ensureDb() {
  try {
    await fs.access(DB_PATH)
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ states: {} }, null, 2), 'utf8')
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

export async function loadSharedState(syncKey) {
  const key = String(syncKey || '').trim()
  if (!key) return null
  const db = await readDb()
  return db.states[key] ?? null
}

export async function saveSharedState(syncKey, todos) {
  const key = String(syncKey || '').trim()
  if (!key) return null

  const db = await readDb()
  db.states[key] = {
    todos: Array.isArray(todos) ? todos : [],
    updatedAt: new Date().toISOString(),
  }
  await writeDb(db)
  return db.states[key]
}