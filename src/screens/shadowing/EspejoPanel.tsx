import { useEffect, useMemo, useRef, useState } from 'react'
import { History, User, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import { PlayChip } from '../../components/PlayChip'
import { RecordButton, type RecordState } from '../../components/RecordButton'
import { MIRROR_TEXTS } from '../../data/mirrorTexts'
import { encouragement, MIC_ERROR_COPY } from '../../data/encouragement'
import { isRecordingSupported, playAudio, startRecording, stopAudio, type RecorderHandle } from '../../lib/audio'
import { getRecording, saveRecording } from '../../lib/db'
import { scorePronunciation } from '../../lib/pronunciation'
import { isSpeechRecognitionSupported, listenLong, speak, type LongListenHandle } from '../../lib/speech'
import type { Profile } from '../../hooks/useProfile'
import { loadShadowPosition, saveShadowPosition } from '../../hooks/useShadowPosition'

export function EspejoPanel({ profile }: { profile: Profile }) {
  const texts = useMemo(
    () => [...MIRROR_TEXTS].sort((a, b) => Number(profile.contexts.includes(b.context)) - Number(profile.contexts.includes(a.context))),
    [profile.contexts],
  )
  const [textId, setTextId] = useState(() => {
    const saved = loadShadowPosition().mirrorTextId
    return texts.some((t) => t.id === saved) ? saved! : texts[0].id
  })
  const text = texts.find((t) => t.id === textId) ?? texts[0]
  const lang = profile.accent === 'gb' ? 'en-GB' : 'en-US'

  const [recState, setRecState] = useState<RecordState>('idle')
  const recorder = useRef<RecorderHandle | null>(null)
  const listener = useRef<LongListenHandle | null>(null)
  const [take, setTake] = useState<Blob | null>(null)
  const [hasFirstTake, setHasFirstTake] = useState(false)
  const [toReview, setToReview] = useState<string[] | null>(null)
  const [transcriptNote, setTranscriptNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [playing, setPlaying] = useState<'me' | 'first' | 'model' | null>(null)
  const recognitionFailed = useRef(false)

  useEffect(() => {
    saveShadowPosition({ mirrorTextId: textId })
    stopAudio()
    setTake(null)
    setToReview(null)
    setTranscriptNote(null)
    setError(null)
    setMessage(null)
    setPlaying(null)
    let cancelled = false
    getRecording(textId, 'first')
      .then((rec) => !cancelled && setHasFirstTake(!!rec))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [textId])

  useEffect(() => () => stopAudio(), [])

  async function start() {
    stopAudio()
    setPlaying(null)
    setError(null)
    setMessage(null)
    setToReview(null)
    setTranscriptNote(null)
    if (!isRecordingSupported()) {
      setError(MIC_ERROR_COPY.unsupported)
      return
    }
    try {
      recorder.current = await startRecording()
    } catch (e) {
      setError(MIC_ERROR_COPY[(e as Error).name] ?? MIC_ERROR_COPY.NotAllowedError)
      return
    }
    recognitionFailed.current = false
    if (isSpeechRecognitionSupported()) {
      listener.current = listenLong(() => {
        recognitionFailed.current = true
      })
    }
    setRecState('recording')
  }

  async function stop() {
    if (!recorder.current) return
    setRecState('busy')
    const [blob, transcript] = await Promise.all([recorder.current.stop(), listener.current?.stop() ?? Promise.resolve('')])
    recorder.current = null
    listener.current = null
    setTake(blob)
    setMessage(encouragement(Date.now()))

    if (!isSpeechRecognitionSupported()) {
      setTranscriptNote('Tu navegador no transcribe voz: escúchate y fíjate tú en lo que suene raro.')
    } else if (!transcript || recognitionFailed.current) {
      setTranscriptNote('No he podido transcribir esta vez (algunos móviles no dejan grabar y transcribir a la vez). Escúchate igualmente.')
    } else {
      const { words } = scorePronunciation(text.text, transcript)
      setToReview([...new Set(words.filter((w) => w.match === 'missing').map((w) => w.word))])
    }

    await saveRecording(textId, blob).catch(() => {})
    setHasFirstTake(true)
    setRecState('idle')
  }

  async function play(which: 'me' | 'first' | 'model') {
    if (playing) {
      stopAudio()
      setPlaying(null)
      return
    }
    setPlaying(which)
    if (which === 'model') {
      await new Promise<void>((resolve) => speak(text.text, resolve, lang, 0.9))
    } else {
      const blob = which === 'me' ? take : (await getRecording(textId, 'first'))?.blob
      if (blob) await playAudio(blob)
    }
    setPlaying(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {texts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTextId(t.id)}
            aria-pressed={t.id === textId}
            disabled={recState !== 'idle'}
            className={clsx(
              'min-h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm transition-colors duration-200',
              t.id === textId
                ? 'border-primary bg-primary-soft font-semibold text-primary'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-primary',
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <p className="mb-3 text-xs uppercase tracking-wide text-primary font-semibold">Léelo en voz alta, sin prisa</p>
        <p className="font-display text-xl leading-relaxed text-[var(--ink)]">{text.text}</p>
      </article>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <RecordButton state={recState} onStart={start} onStop={stop} label="Grabarme leyendo" />
        <p className="text-sm font-medium text-[var(--ink)]" aria-live="polite">
          {recState === 'recording' ? 'Grabando… lee el texto y toca para parar' : recState === 'busy' ? 'Preparando tu grabación…' : 'Grábate leyendo'}
        </p>
        {error && <p className="max-w-sm text-center text-sm text-extra">{error}</p>}

        {take && (
          <div className="flex w-full flex-col gap-4 border-t border-[var(--border)] pt-5">
            {message && <p className="font-display text-lg text-[var(--ink)]">{message}</p>}
            <div className="flex flex-wrap gap-2">
              <PlayChip active={playing === 'me'} onClick={() => play('me')} icon={<User size={16} />}>
                Escucharme
              </PlayChip>
              <PlayChip active={playing === 'model'} onClick={() => play('model')} icon={<Volume2 size={16} />}>
                Modelo
              </PlayChip>
              {hasFirstTake && (
                <PlayChip active={playing === 'first'} onClick={() => play('first')} icon={<History size={16} />}>
                  Mi primera lectura
                </PlayChip>
              )}
            </div>

            {toReview && toReview.length === 0 && (
              <p className="text-sm text-correct">He entendido todas las palabras. Ahora fíjate en el ritmo al escucharte.</p>
            )}
            {toReview && toReview.length > 0 && (
              <div>
                <p className="mb-2 text-sm">
                  Palabras a revisar <span className="opacity-70">(toca para oírlas)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {toReview.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => speak(word, undefined, lang, 0.8)}
                      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-missing-soft px-3 font-mono text-sm text-missing transition-opacity hover:opacity-80"
                    >
                      <Volume2 size={14} /> {word}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {transcriptNote && <p className="text-sm opacity-80">{transcriptNote}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
