import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, Check, ChevronLeft, ChevronRight, Eye, History, Play, Repeat, Square, User } from 'lucide-react'
import clsx from 'clsx'
import { ContextChips } from '../../components/ContextChips'
import { MelodyChart } from '../../components/MelodyChart'
import { PlayChip } from '../../components/PlayChip'
import { RecordButton, type RecordState } from '../../components/RecordButton'
import { CONTEXT_LABEL, matchesFilter, referenceAudioUrl, SHADOW_PHRASES, type ContextFilter } from '../../data/contexts'
import { encouragement, MIC_ERROR_COPY } from '../../data/encouragement'
import { hashParams } from '../../hooks/useRoute'
import { addPhrase, usePhrases } from '../../hooks/usePhrases'
import { decodeToMono, isRecordingSupported, playAudio, startRecording, stopAudio, type RecorderHandle } from '../../lib/audio'
import { getRecording, saveRecording } from '../../lib/db'
import { melodyCurve, type Contour } from '../../lib/pitch'
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
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const takesCount = useRef(0)

  const { phrases } = usePhrases()
  const savedId = phrase ? `shadow-${phrase.id}` : ''
  const alreadySaved = phrases.some((p) => p.id === savedId)

  // Reset per phrase; precompute the native melody so the chart is instant after recording.
  useEffect(() => {
    stopAll()
    setTake(null)
    setUserCurve(null)
    setMessage(null)
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
    setMessage(null)
    if (!isRecordingSupported()) {
      setError(MIC_ERROR_COPY.unsupported)
      return
    }
    try {
      recorder.current = await startRecording()
      setRecState('recording')
    } catch (e) {
      setError(MIC_ERROR_COPY[(e as Error).name] ?? MIC_ERROR_COPY.NotAllowedError)
    }
  }

  async function stop() {
    if (!recorder.current) return
    setRecState('busy')
    const blob = await recorder.current.stop()
    recorder.current = null
    setTake(blob)
    try {
      const curve = melodyCurve(await decodeToMono(blob))
      setUserCurve(curve.some((v) => v !== null) ? curve : null)
      if (!curve.some((v) => v !== null)) setError('No he captado tu voz. Acércate al micrófono y repite.')
      else setMessage(encouragement(takesCount.current++))
      await saveRecording(phrase.id, blob)
      setHasFirstTake(true)
    } catch {
      setError('No he podido analizar la grabación, pero puedes escucharla igualmente.')
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
          <span className="font-mono text-[var(--body-text)]/70">
            {Math.min(index, list.length - 1) + 1}/{list.length}
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
          {recState === 'recording' ? 'Grabando… toca para parar' : recState === 'busy' ? 'Analizando tu melodía…' : 'Tu turno'}
        </p>

        {error && <p className="max-w-sm text-center text-sm text-extra">{error}</p>}

        {(userCurve || take) && (
          <div className="flex w-full flex-col gap-4 border-t border-[var(--border)] pt-5">
            {message && <p className="font-display text-lg text-[var(--ink)]">{message}</p>}
            <MelodyChart reference={refCurve} user={userCurve} />
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
