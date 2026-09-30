import { useCallback, useState } from 'react'
import { CONTEXTS, type Accent, type ContextId } from '../data/contexts'

const STORAGE_KEY = 'speak-fluent-profile'

export interface Profile {
  contexts: ContextId[]
  accent: Accent
}

function loadProfile(): Profile | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || !Array.isArray(parsed.contexts) || !['us', 'gb'].includes(parsed.accent)) return null
    const valid = new Set(CONTEXTS.map((c) => c.id))
    const contexts = parsed.contexts.filter((c: ContextId) => valid.has(c))
    return contexts.length ? { contexts, accent: parsed.accent } : null
  } catch {
    return null
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(loadProfile)

  const setProfile = useCallback((next: Profile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setProfileState(next)
  }, [])

  return { profile, setProfile }
}
