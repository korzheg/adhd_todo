const DAY_IN_MS = 24 * 60 * 60 * 1000

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function parseDeadline(rawText: string, now = new Date()): string | null {
  const text = rawText.toLowerCase()
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (isoMatch) {
    return isoMatch[1]
  }

  if (text.includes('today')) {
    return toIsoDate(now)
  }

  if (text.includes('tomorrow')) {
    return toIsoDate(new Date(now.getTime() + DAY_IN_MS))
  }

  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDaysMatch) {
    const days = Number(inDaysMatch[1])
    return toIsoDate(new Date(now.getTime() + days * DAY_IN_MS))
  }

  const nextWeekMatch = text.match(/\bnext\s+week\b/)
  if (nextWeekMatch) {
    return toIsoDate(new Date(now.getTime() + 7 * DAY_IN_MS))
  }

  return null
}

export function daysUntil(dateString: string | null, now = new Date()): number | null {
  if (!dateString) {
    return null
  }

  const target = new Date(`${dateString}T12:00:00`)
  const today = new Date(now.toISOString().slice(0, 10) + 'T12:00:00')
  const diff = target.getTime() - today.getTime()
  return Math.round(diff / DAY_IN_MS)
}
