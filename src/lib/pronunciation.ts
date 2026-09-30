import type { WordFeedback } from '../types'

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Aligns the heard transcript against the target sentence word-by-word using
 * a longest-common-subsequence backbone, so words spoken in the right order
 * are marked correct even if surrounded by mistakes.
 */
export function scorePronunciation(target: string, heard: string): { words: WordFeedback[]; accuracy: number } {
  const targetWords = normalize(target)
  const heardWords = normalize(heard)

  const rows = targetWords.length + 1
  const cols = heardWords.length + 1
  const lcs: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0))

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      lcs[i][j] =
        targetWords[i - 1] === heardWords[j - 1]
          ? lcs[i - 1][j - 1] + 1
          : Math.max(lcs[i - 1][j], lcs[i][j - 1])
    }
  }

  const words: WordFeedback[] = []
  let i = targetWords.length
  let j = heardWords.length
  const reversed: WordFeedback[] = []

  while (i > 0 && j > 0) {
    if (targetWords[i - 1] === heardWords[j - 1]) {
      reversed.push({ word: targetWords[i - 1], match: 'correct' })
      i--
      j--
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      reversed.push({ word: targetWords[i - 1], match: 'missing' })
      i--
    } else {
      reversed.push({ word: heardWords[j - 1], match: 'extra' })
      j--
    }
  }
  while (i > 0) {
    reversed.push({ word: targetWords[i - 1], match: 'missing' })
    i--
  }
  while (j > 0) {
    reversed.push({ word: heardWords[j - 1], match: 'extra' })
    j--
  }

  words.push(...reversed.reverse())

  const correctCount = words.filter((w) => w.match === 'correct').length
  const accuracy = targetWords.length === 0 ? 0 : Math.round((correctCount / targetWords.length) * 100)

  return { words, accuracy }
}
