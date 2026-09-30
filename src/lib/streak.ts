/**
 * Daily habit maths. A day counts once the learner practises MIN_DAY_SECONDS;
 * the goal is DAILY_GOAL_SECONDS (20 min, "better 20 minutes a day than
 * nothing"). One missed day per week is forgiven automatically so a single
 * slip never wipes the streak — constancy without guilt.
 */

export const DAILY_GOAL_SECONDS = 20 * 60
export const MIN_DAY_SECONDS = 3 * 60

export type DayLog = Record<string, number>

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Key of the Monday that starts the week containing `date`. */
export function weekKey(date: Date): string {
  const offset = (date.getDay() + 6) % 7
  return dayKey(addDays(date, -offset))
}

export interface StreakInfo {
  streak: number
  todaySeconds: number
  freezeUsedThisWeek: boolean
}

export function computeStreak(log: DayLog, todayKey: string): StreakInfo {
  const today = parseKey(todayKey)
  const practised = (d: Date) => (log[dayKey(d)] ?? 0) >= MIN_DAY_SECONDS
  const frozenWeeks = new Set<string>()
  let streak = 0
  // Today still pending doesn't break anything: start counting from yesterday.
  let cursor = practised(today) ? today : addDays(today, -1)

  for (let guard = 0; guard < 800; guard++) {
    if (practised(cursor)) {
      streak++
    } else {
      const week = weekKey(cursor)
      if (streak === 0 || frozenWeeks.has(week) || !practised(addDays(cursor, -1))) break
      frozenWeeks.add(week)
    }
    cursor = addDays(cursor, -1)
  }

  return {
    streak,
    todaySeconds: log[todayKey] ?? 0,
    freezeUsedThisWeek: frozenWeeks.has(weekKey(today)),
  }
}
