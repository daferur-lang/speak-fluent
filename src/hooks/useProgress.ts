import { useCallback, useEffect, useState } from 'react'
import { promptsByLevel } from '../data/prompts'
import { CEFR_LEVELS, PASS_ACCURACY } from '../types'
import type { CEFRLevel, ProgressState } from '../types'

const STORAGE_KEY = 'speak-fluent-progress'

function defaultProgress(): ProgressState {
  return { unlockedLevel: 'A1', activeLevel: 'A1', bestAccuracyByPromptId: {} }
}

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw)
    if (!CEFR_LEVELS.includes(parsed.unlockedLevel) || !CEFR_LEVELS.includes(parsed.activeLevel)) {
      return defaultProgress()
    }
    return {
      unlockedLevel: parsed.unlockedLevel,
      activeLevel: parsed.activeLevel,
      bestAccuracyByPromptId: parsed.bestAccuracyByPromptId ?? {},
    }
  } catch {
    return defaultProgress()
  }
}

function isLevelComplete(level: CEFRLevel, bestAccuracyByPromptId: Record<string, number>): boolean {
  return promptsByLevel[level].every((p) => (bestAccuracyByPromptId[p.id] ?? 0) >= PASS_ACCURACY)
}

function nextLevel(level: CEFRLevel): CEFRLevel | null {
  const index = CEFR_LEVELS.indexOf(level)
  return index >= 0 && index < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[index + 1] : null
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(loadProgress)
  const [justLeveledUpTo, setJustLeveledUpTo] = useState<CEFRLevel | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const recordResult = useCallback((promptId: string, level: CEFRLevel, accuracy: number) => {
    setProgress((prev) => {
      const previousBest = prev.bestAccuracyByPromptId[promptId] ?? 0
      const bestAccuracyByPromptId = {
        ...prev.bestAccuracyByPromptId,
        [promptId]: Math.max(previousBest, accuracy),
      }

      let unlockedLevel = prev.unlockedLevel
      if (level === prev.unlockedLevel && isLevelComplete(level, bestAccuracyByPromptId)) {
        const upgraded = nextLevel(level)
        if (upgraded) {
          unlockedLevel = upgraded
          setJustLeveledUpTo(upgraded)
        }
      }

      return { ...prev, unlockedLevel, bestAccuracyByPromptId }
    })
  }, [])

  const setActiveLevel = useCallback((level: CEFRLevel) => {
    setProgress((prev) =>
      CEFR_LEVELS.indexOf(level) <= CEFR_LEVELS.indexOf(prev.unlockedLevel) ? { ...prev, activeLevel: level } : prev,
    )
  }, [])

  const dismissLevelUp = useCallback(() => setJustLeveledUpTo(null), [])

  const levelCompletedCount = useCallback(
    (level: CEFRLevel) =>
      promptsByLevel[level].filter((p) => (progress.bestAccuracyByPromptId[p.id] ?? 0) >= PASS_ACCURACY).length,
    [progress.bestAccuracyByPromptId],
  )

  return { progress, recordResult, setActiveLevel, justLeveledUpTo, dismissLevelUp, levelCompletedCount }
}
