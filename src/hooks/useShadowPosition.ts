import type { ContextFilter } from '../data/contexts'

const STORAGE_KEY = 'speak-fluent-shadow-position'

export interface ShadowPosition {
  filter?: ContextFilter
  phraseId?: string
  mirrorTextId?: string
}

/** Last place the learner was in Shadowing, so the next session continues there. */
export function loadShadowPosition(): ShadowPosition {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveShadowPosition(patch: ShadowPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadShadowPosition(), ...patch }))
  } catch {
    // Storage unavailable (private mode): the session just won't resume.
  }
}
