// crypto.randomUUID() requires HTTPS — provide a safe fallback for local HTTP dev (iPhone via IP).
export function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  }
}
