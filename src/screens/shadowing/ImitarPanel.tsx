import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, History, Play, Repeat, Square, User, Waves } from 'lucide-react'
import clsx from 'clsx'
import { ContextChips } from '../../components/ContextChips'
import { MelodyChart } from '../../components/MelodyChart'
import { PlayChip } from '../../components/PlayChip'
import { RecordButton, type RecordState } from '../../components/RecordButton'
import { CONTEXT_LABEL, matchesFilter, referenceAudioUrl, SHADOW_PHRASES, type ContextFilter } from '../../data/contexts'
import { encouragement, MIC_ERROR_COPY } from '../../data/encouragement'
import { useShadowProgress } from '../../hooks/useShadowProgress'
import { hashParams } from '../../hooks/useRoute'
import { addPhrase, usePhrases } from '../../hooks/usePhrases'
import { decodeToMono, isRecordingSupported, playAudio, startRecording, stopAudio, type RecorderHandle } from '../../lib/audio'
import { getRecording, saveRecording } from '../../lib/db'
import { assessIntonation, intonationTip, isTakePassed, LEVEL_LABEL, type IntonationResult } from '../../lib/intonation'
import { melodyCurve, type Contour } from '../../lib/pitch'
import { scorePronunciation } from '../../lib/pronunciation'
import { isSpeechRecognitionSupported, listenLong, type LongListenHandle } from '../../lib/speech'
import { PASS_ACCURACY } from '../../types'
import type { Profile } from '../../hooks/useProfile'

const referenceCurves = new Map<string, Promise<Contour>>()

function referenceCurve(url: string): Promise<Contour> {
  if (!referenceCurves.has(url)) {
    const promise = decodeToMono(url).then((samples) => melodyCurve(samples))
    promise.catch(() => referenceCurves.delete(url))
    referenceCurves.set(url, promise)
  }
  return referenceCurves.get(url)!
}

type Playing = 'ref' | 'me' | 'ab' | 'first' | null

interface TakeResult {
  /** null = this device couldn't transcribe while recording. */
  understood: { said: number; total: number; accuracy: number } | null
  intonation: IntonationResult | null
  passed: boolean
}

export function ImitarPanel({ profile }: { profile: Profile }) {
  const initialId = hashParams().get('id')
  const [filter, setFilter] = useState<ContextFilter>(() => {
    const initial = SHADOW_PHRASES.find((p) => p.id === initialId)
    return initial && !profile.contexts.includes(initial.context) ? 'all' : 'mine'
  })
  const list = useMemo(
    () => SHADOW_PHRASES.filter((p) => matchesFilter(p.context, filter, profile.contexts)),
    [filter, profile.contexts],
  )
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((p) => p.id === initialId)))
  const phrase = list[Math.min(index, list.length - 1)]
  const phraseId = phrase?.id
  const refUrl = phrase ? referenceAudioUrl(phrase.id, profile.accent) : ''

  const [rate, setRate] = useState<0.75 | 1>(1)
  const [looping, setLooping] = useState(false)
  const loopRef = useRef(false)
  const playToken = useRef(0)
  const [playing, setPlaying] = useState<Playing>(null)
  const [showEs, setShowEs] = useState(false)

  const [recState, setRecState] = useState<RecordState>('idle')
  const recorder = useRef<RecorderHandle | null>(null)
  const [take, setTake] = useState<Blob | null>(null)
  const [hasFirstTake, setHasFirstTake] = useState(false)
  const [refCurve, setRefCurve] = useState<Contour | null>(null)
  const [userCurve, setUserCurve] = useState<Contour | null>(null)
  const [result, setResult] = useState<TakeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const takesCount = useRef(0)
  const listener = useRef<LongListenHandle | null>(null)
  const recognitionFailed = useRef(false)
  const { passed, markPassed } = useShadowProgress()
  const passedInList = list.filter((p) => passed.has(p.id)).length

  const { phrases } = usePhrases()
  const savedId = phrase ? `shadow-${phrase.id}` : ''
  const alreadySaved = phrases.some((p) => p.id === savedId)

  // Reset per phrase; precompute the native melody so the chart is instant after recording.
  useEffect(() => {
    stopAll()
    setTake(null)
    setUserCurve(null)
    setResult(null)
    setError(null)
    setShowEs(false)
    setRefCurve(null)
    if (!phraseId) return
    let cancelled = false
    referenceCurve(refUrl)
      .then((curve) => !cancelled && setRefCurve(curve))
      .catch(() => {})
    getRecording(phraseId, 'first')
      .then((rec) => !cancelled && setHasFirstTake(!!rec))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refUrl, phraseId])

  useEffect(() => () => stopAll(), [])

  function stopAll() {
    playToken.current++
    loopRef.current = false
    setLooping(false)
    stopAudio()
    setPlaying(null)
  }

  async function playReference(loop: boolean) {
    if (playing) {
      stopAll()
      return
    }
    loopRef.current = loop
    setLooping(loop)
    setPlaying('ref')
    do {
      await playAudio(refUrl, rate)
      if (loopRef.current) await new Promise((r) => setTimeout(r, 1200))
    } while (loopRef.current)
    setPlaying(null)
  }

  async function playMine(which: 'me' | 'ab' | 'first') {
    if (playing) {
      stopAll()
      return
    }
    const token = ++playToken.current
    setPlaying(which)
    if (which === 'first') {
      const first = await getRecording(phrase.id, 'first')
      if (first) await playAudio(first.blob)
    } else if (take) {
      if (which === 'ab') {
        await playAudio(refUrl, rate)
        await new Promise((r) => setTimeout(r, 400))
        if (playToken.current !== token) return
      }
      await playAudio(take)
    }
    if (playToken.current === token) setPlaying(null)
  }

  async function start() {
    stopAll()
    setError(null)
    setResult(null)
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
    // Transcribe at the same time to check the take is understood (some phones don't allow it).
    recognitionFailed.current = false
    listener.current = isSpeechRecognitionSupported()
      ? listenLong(() => {
          recognitionFailed.current = true
        })
      : null
    setRecState('recording')
  }

  async function stop() {
    if (!recorder.current) return
    setRecState('busy')
    const [blob, transcript] = await Promise.all([recorder.current.stop(), listener.current?.stop() ?? Promise.resolve('')])
    recorder.current = null
    listener.current = null
    setTake(blob)

    let understood: TakeResult['understood'] = null
    if (transcript && !recognitionFailed.current) {
      const { words, accuracy } = scorePronunciation(phrase.text, transcript)
      const targetWords = words.filter((w) => w.match !== 'extra')
      understood = { said: targetWords.filter((w) => w.match === 'correct').length, total: targetWords.length, accuracy }
    }

    let intonation: IntonationResult | null = null
    try {
      const curve = melodyCurve(await decodeToMono(blob))
      const hasVoice = curve.some((v) => v !== null)
      setUserCurve(hasVoice ? curve : null)
      const reference = refCurve ?? (await referenceCurve(refUrl).catch(() => null))
      if (hasVoice && reference) intonation = assessIntonation(reference, curve)
      await saveRecording(phrase.id, blob)
      setHasFirstTake(true)
    } catch {
      setError('No he podido analizar la melodía, pero puedes escucharte igualmente.')
    }

    if (!understood && !intonation) {
      setError('No he captado tu voz. Acércate al micrófono y repite.')
    } else {
      const ok = isTakePassed(understood?.accuracy ?? null, intonation?.level ?? null, PASS_ACCURACY)
      if (ok) markPassed(phrase.id)
      setResult({ understood, intonation, passed: ok })
      takesCount.current++
    }
    setRecState('idle')
  }

  function go(delta: number) {
    setIndex((i) => (i + delta + list.length) % list.length)
  }

  if (!phrase) {
    return (
      <>
        <ContextChips value={filter} onChange={(f) => (setFilter(f), setIndex(0))} />
        <p className="text-sm">No hay frases para este tema.</p>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ContextChips value={filter} onChange={(f) => (setFilter(f), setIndex(0))} />

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs uppercase tracking-wide">
          <span className="font-semibold text-primary">
            {CONTEXT_LABEL[phrase.context]} · {phrase.level}
          </span>
          <span className="inline-flex items-center gap-2 font-mono normal-case text-[var(--body-text)]/80">
            {passed.has(phrase.id) && <CheckCircle2 size={14} className="text-correct" aria-label="Superada" />}
            {Math.min(index, list.length - 1) + 1}/{list.length} · {passedInList} superadas
          </span>
        </div>
        <p className="font-display text-2xl leading-snug text-[var(--ink)] sm:text-3xl">{phrase.text}</p>
        <button
          type="button"
          onClick={() => setShowEs((s) => !s)}
          className="mt-3 inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm text-[var(--body-text)] hover:text-[var(--ink)]"
        >
          <Eye size={16} strokeWidth={1.75} />
          {showEs ? phrase.es : 'Ver traducción'}
        </button>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playReference(false)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            {playing === 'ref' && !looping ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            Escuchar
          </button>
          <button
            type="button"
            onClick={() => playReference(true)}
            aria-pressed={looping}
            className={clsx(
              'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
              looping ? 'border-primary bg-primary-soft text-primary' : 'border-[var(--border)] hover:border-primary',
            )}
          >
            <Repeat size={16} /> En bucle
          </button>
          <div className="ml-auto inline-flex rounded-full border border-[var(--border)] p-0.5 text-xs font-mono">
            {([0.75, 1] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                aria-pressed={rate === r}
                className={clsx(
                  'min-h-9 min-w-12 cursor-pointer rounded-full px-2',
                  rate === r ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:text-[var(--ink)]',
                )}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          Ponlo en bucle y repite <strong className="text-[var(--ink)]">a la vez</strong> en voz baja, copiando ritmo y melodía. Cuando
          lo tengas, grábate tú solo.
        </p>
      </article>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <RecordButton state={recState} onStart={start} onStop={stop} label="Grabarme imitando" />
        <p className="text-sm font-medium text-[var(--ink)]" aria-live="polite">
          {recState === 'recording' ? 'Grabando… toca para parar' : recState === 'busy' ? 'Escuchando cómo lo has dicho…' : 'Tu turno'}
        </p>

        {error && <p className="max-w-sm text-center text-sm text-extra">{error}</p>}

        {result && (
          <div className="flex w-full flex-col gap-4 border-t border-[var(--border)] pt-5">
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className={clsx('mt-0.5 shrink-0', result.understood && result.understood.accuracy >= PASS_ACCURACY ? 'text-correct' : 'text-missing')}
                />
                <span>
                  {result.understood ? (
                    <>
                      <strong className="text-[var(--ink)]">
                        {result.understood.accuracy >= PASS_ACCURACY ? 'Se te entiende' : 'Casi se te entiende'}
                      </strong>{' '}
                      — {result.understood.said} de {result.understood.total} palabras
                    </>
                  ) : (
                    'Este dispositivo no deja transcribir mientras grabas: te valoro solo por la melodía.'
                  )}
                </span>
              </li>
              {result.intonation && (
                <li className="flex items-start gap-3">
                  <Waves size={20} className={clsx('mt-0.5 shrink-0', result.intonation.level === 'exagera' ? 'text-missing' : 'text-correct')} />
                  <span>
                    <strong className="text-[var(--ink)]">Entonación: {LEVEL_LABEL[result.intonation.level]}</strong>{' '}
                    {intonationTip(result.intonation)}
                  </span>
                </li>
              )}
            </ul>

            {result.passed ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-correct-soft p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-display text-xl text-[var(--ink)]">¡Frase superada!</p>
                  <p className="text-sm">{encouragement(takesCount.current)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-[var(--color-surface)] hover:bg-primary-hover"
                >
                  Siguiente frase <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <p className="text-sm">Escúchala otra vez en bucle y repite. Puedes pasar a la siguiente cuando quieras.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <PlayChip active={playing === 'me'} onClick={() => playMine('me')} icon={<User size={16} />}>
                Escucharme
              </PlayChip>
              <PlayChip active={playing === 'ab'} onClick={() => playMine('ab')} icon={<Play size={16} />}>
                Nativo → yo
              </PlayChip>
              {hasFirstTake && (
                <PlayChip active={playing === 'first'} onClick={() => playMine('first')} icon={<History size={16} />}>
                  Mi primera toma
                </PlayChip>
              )}
            </div>

            {userCurve && (
              <details className="group">
                <summary className="min-h-9 cursor-pointer list-none text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">▸ Ver mi entonación</span>
                  <span className="hidden group-open:inline">▾ Ocultar mi entonación</span>
                </summary>
                <div className="mt-3">
                  <MelodyChart reference={refCurve} user={userCurve} />
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2">
        <NavButton onClick={() => go(-1)} label="Frase anterior">
          <ChevronLeft size={20} />
        </NavButton>
        <button
          type="button"
          disabled={alreadySaved}
          onClick={() =>
            addPhrase({ id: savedId, text: phrase.text, es: phrase.es, context: phrase.context, ownSentence: '', source: 'Shadowing' })
          }
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold transition-colors hover:border-primary disabled:cursor-default disabled:text-correct"
        >
          {alreadySaved ? <Check size={16} /> : <BookmarkPlus size={16} />}
          {alreadySaved ? 'En mis repasos' : 'Añadir a mis repasos'}
        </button>
        <NavButton onClick={() => go(1)} label="Frase siguiente">
          <ChevronRight size={20} />
        </NavButton>
      </div>
    </div>
  )
}


function NavButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-primary"
    >
      {children}
    </button>
  )
}
