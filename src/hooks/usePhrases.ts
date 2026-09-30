import { useCallback, useEffect, useState } from 'react'
import { deletePhrase, listPhrases, savePhrase, type UserPhrase } from '../lib/db'
import { isDue, newCard } from '../lib/srs'
import type { ContextId } from '../data/contexts'

const CHANGED_EVENT = 'speak-fluent-phrases'

export interface NewPhrase {
  text: string
  es: string
  context: ContextId
  ownSentence: string
  source: string
  id?: string
}

export async function addPhrase(input: NewPhrase): Promise<void> {
  await savePhrase({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: Date.now(),
    card: newCard(),
  })
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function usePhrases() {
  const [phrases, setPhrases] = useState<UserPhrase[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(() => {
    listPhrases()
      .then(setPhrases)
      .catch(() => setPhrases([]))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(CHANGED_EVENT, refresh)
    return () => window.removeEventListener(CHANGED_EVENT, refresh)
  }, [refresh])

  const update = useCallback(async (phrase: UserPhrase) => {
    await savePhrase(phrase)
    window.dispatchEvent(new Event(CHANGED_EVENT))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deletePhrase(id)
    window.dispatchEvent(new Event(CHANGED_EVENT))
  }, [])

  const due = phrases.filter((p) => isDue(p.card))

  return { phrases, due, loaded, update, remove }
}
