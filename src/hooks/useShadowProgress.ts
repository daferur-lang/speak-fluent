import { useCallback, useState } from 'react'

const STORAGE_KEY = 'speak-fluent-shadow-passed'

function load(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

/** Which shadowing phrases the learner has already passed (local only). */
export function useShadowProgress() {
  const [passed, setPassed] = useState<Set<string>>(load)

  const markPassed = useCallback((id: string) => {
    setPassed((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // Storage can be unavailable (private mode); progress just won't persist.
      }
      return next
    })
  }, [])

  return { passed, markPassed }
}
