import { useCallback, useEffect, useRef, useState } from 'react'
import { addPracticeSeconds, getDayLog } from '../lib/db'
import { computeStreak, dayKey, type StreakInfo } from '../lib/streak'

const TICK_SECONDS = 15
const IDLE_AFTER_MS = 90_000
const UPDATED_EVENT = 'speak-fluent-practice'

/**
 * Counts practice time while `active` (a practice tab is open), the page is
 * visible and the learner interacted recently — so leaving the app open on a
 * table doesn't inflate the daily minutes.
 */
export function usePracticeTimer(active: boolean) {
  const lastInteraction = useRef(0)

  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now()
    }
    window.addEventListener('pointerdown', mark)
    window.addEventListener('keydown', mark)
    return () => {
      window.removeEventListener('pointerdown', mark)
      window.removeEventListener('keydown', mark)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastInteraction.current > IDLE_AFTER_MS) return
      addPracticeSeconds(dayKey(new Date()), TICK_SECONDS)
        .then(() => window.dispatchEvent(new Event(UPDATED_EVENT)))
        .catch(() => {})
    }, TICK_SECONDS * 1000)
    return () => window.clearInterval(id)
  }, [active])
}

export function useStreak(): StreakInfo | null {
  const [info, setInfo] = useState<StreakInfo | null>(null)

  const refresh = useCallback(() => {
    getDayLog()
      .then((log) => setInfo(computeStreak(log, dayKey(new Date()))))
      .catch(() => setInfo({ streak: 0, todaySeconds: 0, freezeUsedThisWeek: false }))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(UPDATED_EVENT, refresh)
    return () => window.removeEventListener(UPDATED_EVENT, refresh)
  }, [refresh])

  return info
}
