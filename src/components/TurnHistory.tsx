import { MessageCircleHeart } from 'lucide-react'
import type { TurnHistoryEntry } from '../hooks/useConversation'
import { AccuracyMeter } from './AccuracyMeter'
import { WordFeedbackText } from './WordFeedbackText'

export function TurnHistory({ history }: { history: TurnHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--body-text)]/70 py-8">
        Tu historial de práctica aparecerá aquí después de tu primer turno.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {[...history].reverse().map((turn, i) => (
        <li
          key={`${turn.target}-${i}`}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-[var(--body-text)]/70">{turn.situation}</p>
              <div className="mt-2">
                <WordFeedbackText words={turn.words} />
              </div>
            </div>
            <AccuracyMeter accuracy={turn.accuracy} />
          </div>
          <div className="mt-4 flex gap-2 rounded-xl bg-primary-soft p-3 text-sm text-[var(--ink)]">
            <MessageCircleHeart size={18} strokeWidth={1.75} className="shrink-0 text-primary" />
            <p>{turn.feedback}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
