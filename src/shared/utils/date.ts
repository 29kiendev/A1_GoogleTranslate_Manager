export function startOfWeek(date = new Date()): number {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function toISODate(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
