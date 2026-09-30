import clsx from 'clsx'
import type { WordFeedback } from '../types'

const STYLES: Record<WordFeedback['match'], string> = {
  correct: 'text-correct bg-correct-soft',
  missing: 'text-missing bg-missing-soft line-through decoration-2',
  extra: 'text-extra bg-extra-soft',
}

export function WordFeedbackText({ words }: { words: WordFeedback[] }) {
  return (
    <p className="font-mono text-base leading-loose flex flex-wrap gap-x-1.5 gap-y-1">
      {words.map((w, i) => (
        <span key={`${w.word}-${i}`} className={clsx('rounded px-1.5 py-0.5', STYLES[w.match])}>
          {w.word}
        </span>
      ))}
    </p>
  )
}
