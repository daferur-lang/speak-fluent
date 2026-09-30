import { useRef, useState } from 'react'
import { ArrowLeft, Volume2 } from 'lucide-react'
import { RecordButton, type RecordState } from '../../components/RecordButton'
import { WordFeedbackText } from '../../components/WordFeedbackText'
import { CONTEXT_LABEL } from '../../data/contexts'
import { scorePronunciation } from '../../lib/pronunciation'
import { isSpeechRecognitionSupported, listenOnce, speak, type RecognitionHandle } from '../../lib/speech'
import { accuracyToRating, Rating, RATING_LABELS, review, type Grade } from '../../lib/srs'
import type { UserPhrase } from '../../lib/db'
import type { WordFeedback } from '../../types'
import type { Profile } from '../../hooks/useProfile'

interface ReviewSessionProps {
  queue: UserPhrase[]
  profile: Profile
  onExit: () => void
  onGrade: (phrase: UserPhrase) => Promise<void>
}

interface Outcome {
  words: WordFeedback[] | null
  rating: Grade
}

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'Necesito permiso para usar el micrófono.',
  'no-speech': 'No te he oído. Prueba otra vez un poco más cerca.',
}

export function ReviewSession({ queue: initialQueue, profile, onExit, onGrade }: ReviewSessionProps) {
  // Snapshot the queue: grading reschedules cards, which would otherwise reshuffle the list mid-session.
  const [queue] = useState(initialQueue)
  const [position, setPosition] = useState(0)
  const [recState, setRecState] = useState<RecordState>('idle')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handle = useRef<RecognitionHandle | null>(null)
  const canListen = isSpeechRecognitionSupported()
  const lang = profile.accent === 'gb' ? 'en-GB' : 'en-US'
  const phrase = queue[position]

  if (!phrase) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">Repaso hecho</p>
        <p className="text-sm">
          {queue.length} {queue.length === 1 ? 'frase dicha' : 'frases dichas'} en voz alta. Volverán justo antes de que se te olviden.
        </p>
        <button type="button" onClick={onExit} className="min-h-12 cursor-pointer rounded-full bg-primary px-6 font-semibold text-[var(--color-surface)]">
          Volver a mis frases
        </button>
      </div>
    )
  }

  function grade(rating: Grade, words: WordFeedback[] | null) {
    setOutcome({ rating, words })
    setRevealed(true)
    onGrade({ ...phrase, card: review(phrase.card, rating) }).catch(() => {})
  }

  function listen() {
    setError(null)
    setRecState('recording')
    handle.current = listenOnce(
      (heard) => {
        setRecState('idle')
        const { words, accuracy } = scorePronunciation(phrase.text, heard)
        grade(accuracyToRating(accuracy), words)
      },
      (message) => {
        setRecState('idle')
        setError(RECOGNITION_ERRORS[message] ?? 'No he podido escucharte. Inténtalo de nuevo.')
      },
    )
  }

  function next() {
    setOutcome(null)
    setRevealed(false)
    setError(null)
    setPosition((p) => p + 1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <ArrowLeft size={18} /> Salir
        </button>
        <span className="font-mono text-sm">
          {position + 1}/{queue.length}
        </span>
      </div>

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
          {CONTEXT_LABEL[phrase.context]} · dilo en inglés
        </p>
        <p className="font-display text-2xl leading-snug text-[var(--ink)]">{phrase.es}</p>

        {revealed && (
          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5">
            {outcome?.words ? <WordFeedbackText words={outcome.words} /> : <p className="font-display text-xl text-[var(--ink)]">{phrase.text}</p>}
            {outcome?.words && <p className="text-sm">Frase: {phrase.text}</p>}
            <button
              type="button"
              onClick={() => speak(phrase.text, undefined, lang, 0.9)}
              className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-semibold hover:border-primary"
            >
              <Volume2 size={16} /> Escuchar
            </button>
            {phrase.ownSentence && (
              <p className="border-l-2 border-accent pl-3 text-sm">
                Ahora di tu frase: <span className="italic text-[var(--ink)]">«{phrase.ownSentence}»</span>
              </p>
            )}
          </div>
        )}
      </article>

      {!revealed && (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {canListen ? (
            <>
              <RecordButton state={recState} onStart={listen} onStop={() => handle.current?.stop()} label="Decirlo" />
              <p className="text-sm font-medium text-[var(--ink)]" aria-live="polite">
                {recState === 'recording' ? 'Te escucho…' : 'Toca y dilo en voz alta'}
              </p>
              {error && <p className="text-center text-sm text-extra">{error}</p>}
              <button type="button" onClick={() => grade(Rating.Again, null)} className="min-h-9 cursor-pointer text-sm underline underline-offset-4">
                No me sale, enséñamela
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm">Dilo en voz alta y luego comprueba. (Tu navegador no reconoce voz: te valoras tú.)</p>
              <button type="button" onClick={() => setRevealed(true)} className="min-h-12 cursor-pointer rounded-full bg-primary px-6 font-semibold text-[var(--color-surface)]">
                Mostrar respuesta
              </button>
            </>
          )}
        </section>
      )}

      {revealed && !outcome && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => grade(r, null)}
              className="min-h-12 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] font-semibold hover:border-primary"
            >
              {RATING_LABELS[r]}
            </button>
          ))}
        </div>
      )}

      {outcome && (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm">
            {outcome.rating === Rating.Again
              ? 'Sin problema: vuelve pronto para que se te quede.'
              : `${RATING_LABELS[outcome.rating]}. La próxima vez tardará más en volver.`}
          </p>
          <button type="button" onClick={next} className="min-h-12 cursor-pointer rounded-full bg-primary px-6 font-semibold text-[var(--color-surface)]">
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
