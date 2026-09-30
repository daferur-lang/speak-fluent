import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'

export type { Card, Grade }
export { Rating }

const scheduler = fsrs({ enable_fuzz: true })

export function newCard(now = new Date()): Card {
  return createEmptyCard(now)
}

/**
 * Spoken review: the pronunciation accuracy of what the learner said becomes
 * the FSRS grade, so reviewing never requires typing or self-judgement.
 */
export function accuracyToRating(accuracy: number): Grade {
  if (accuracy >= 90) return Rating.Easy
  if (accuracy >= 70) return Rating.Good
  if (accuracy >= 40) return Rating.Hard
  return Rating.Again
}

export function review(card: Card, rating: Grade, now = new Date()): Card {
  return scheduler.next(card, now, rating).card
}

export function isDue(card: Card, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime()
}

export const RATING_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Otra vez',
  [Rating.Hard]: 'Difícil',
  [Rating.Good]: 'Bien',
  [Rating.Easy]: 'Fácil',
}
