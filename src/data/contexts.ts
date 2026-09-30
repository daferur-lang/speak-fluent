import { Briefcase, Coffee, Gamepad2, Home, MessageCircle, Plane, type LucideIcon } from 'lucide-react'
import shadowingData from './shadowing.json'
import type { CEFRLevel } from '../types'

export type ContextId = 'food' | 'work' | 'travel' | 'family' | 'hobbies' | 'smalltalk'

export const CONTEXTS: { id: ContextId; label: string; icon: LucideIcon }[] = [
  { id: 'smalltalk', label: 'Charlar', icon: MessageCircle },
  { id: 'work', label: 'Trabajo', icon: Briefcase },
  { id: 'travel', label: 'Viajes', icon: Plane },
  { id: 'food', label: 'Comer fuera', icon: Coffee },
  { id: 'family', label: 'Familia', icon: Home },
  { id: 'hobbies', label: 'Aficiones', icon: Gamepad2 },
]

export type ContextFilter = 'mine' | 'all' | ContextId

export function matchesFilter(context: ContextId, filter: ContextFilter, mine: ContextId[]): boolean {
  if (filter === 'all') return true
  if (filter === 'mine') return mine.includes(context)
  return context === filter
}

export const CONTEXT_LABEL = Object.fromEntries(CONTEXTS.map((c) => [c.id, c.label])) as Record<ContextId, string>

export interface ShadowPhrase {
  id: string
  context: ContextId
  level: CEFRLevel
  text: string
  es: string
  situation: string
}

export const SHADOW_PHRASES = shadowingData as ShadowPhrase[]

export type Accent = 'us' | 'gb'

export function referenceAudioUrl(id: string, accent: Accent): string {
  return `/audio/${id}-${accent}.mp3`
}
