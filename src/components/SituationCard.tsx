import { Quote } from 'lucide-react'
import type { SpeakingPrompt } from '../types'

export function SituationCard({ prompt }: { prompt: SpeakingPrompt }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-sm">
      <span className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
        {prompt.level} · {prompt.situation}
      </span>
      <div className="mt-4 flex gap-3">
        <Quote size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-primary" />
        <h2 className="text-2xl leading-snug">{prompt.targetSentence}</h2>
      </div>
      <p className="mt-3 text-sm text-[var(--body-text)]">{prompt.hint}</p>
    </div>
  )
}
