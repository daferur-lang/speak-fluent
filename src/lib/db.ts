import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Card } from './srs'
import type { ContextId } from '../data/contexts'
import type { DayLog } from './streak'

export interface UserPhrase {
  id: string
  text: string
  es: string
  context: ContextId
  ownSentence: string
  source: string
  createdAt: number
  card: Card
}

export interface StoredRecording {
  blob: Blob
  createdAt: number
}

interface SpeakFluentDB extends DBSchema {
  phrases: { key: string; value: UserPhrase }
  recordings: { key: string; value: StoredRecording }
  days: { key: string; value: number }
}

let dbPromise: Promise<IDBPDatabase<SpeakFluentDB>> | null = null

function db() {
  dbPromise ??= openDB<SpeakFluentDB>('speak-fluent', 1, {
    upgrade(database) {
      database.createObjectStore('phrases', { keyPath: 'id' })
      database.createObjectStore('recordings')
      database.createObjectStore('days')
    },
  })
  return dbPromise
}

export async function listPhrases(): Promise<UserPhrase[]> {
  const all = await (await db()).getAll('phrases')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function savePhrase(phrase: UserPhrase): Promise<void> {
  await (await db()).put('phrases', phrase)
}

export async function deletePhrase(id: string): Promise<void> {
  await (await db()).delete('phrases', id)
}

/** Keeps the very first take and the latest one, so the learner can hear their own progress. */
export async function saveRecording(phraseId: string, blob: Blob): Promise<void> {
  const database = await db()
  const entry = { blob, createdAt: Date.now() }
  if (!(await database.get('recordings', `${phraseId}:first`))) {
    await database.put('recordings', entry, `${phraseId}:first`)
  }
  await database.put('recordings', entry, `${phraseId}:latest`)
}

export async function getRecording(phraseId: string, which: 'first' | 'latest'): Promise<StoredRecording | undefined> {
  return (await db()).get('recordings', `${phraseId}:${which}`)
}

export async function addPracticeSeconds(key: string, seconds: number): Promise<void> {
  const database = await db()
  const tx = database.transaction('days', 'readwrite')
  const current = (await tx.store.get(key)) ?? 0
  await tx.store.put(current + seconds, key)
  await tx.done
}

export async function getDayLog(): Promise<DayLog> {
  const database = await db()
  const keys = await database.getAllKeys('days')
  const values = await database.getAll('days')
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]))
}
