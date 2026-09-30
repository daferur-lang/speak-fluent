import { useMemo, useState } from 'react'
import { ArrowRight, AudioLines, Flame, Headphones, Volume2 } from 'lucide-react'
import { CONTEXT_LABEL, SHADOW_PHRASES } from '../data/contexts'
import { useStreak } from '../hooks/useHabit'
import { usePhrases } from '../hooks/usePhrases'
import { speak } from '../lib/speech'
import { dayKey, DAILY_GOAL_SECONDS } from '../lib/streak'
import type { Profile } from '../hooks/useProfile'

/** Small immersion nudges from home: English in the day, not an on/off "study mode". */
const EXPOSURE_TIPS = [
  'Pon un podcast en inglés mientras desayunas, aunque no lo entiendas todo.',
  'Nombra en inglés tres cosas que tengas delante ahora mismo.',
  'Cambia la música de hoy a canciones en inglés y fíjate en una frase.',
  'Antes de pedir algo hoy, piensa cómo lo dirías en inglés.',
  'Ve un capítulo de tu serie con audio en inglés y subtítulos en inglés.',
  'Cuando algo no lo entiendas: para, vuelve atrás, escríbelo y hazlo tuyo en «Mis frases».',
  'Narra en voz baja en inglés lo que estás haciendo durante un minuto.',
]

function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function HoyScreen({ profile }: { profile: Profile }) {
  const today = dayKey(new Date())
  const streak = useStreak()
  const { due } = usePhrases()
  const [revealed, setRevealed] = useState(false)
  const lang = profile.accent === 'gb' ? 'en-GB' : 'en-US'

  const situation = useMemo(() => {
    const pool = SHADOW_PHRASES.filter((p) => profile.contexts.includes(p.context))
    const list = pool.length ? pool : SHADOW_PHRASES
    return list[hash(today) % list.length]
  }, [profile.contexts, today])
  const tip = EXPOSURE_TIPS[hash(today + 'tip') % EXPOSURE_TIPS.length]

  const minutes = Math.floor((streak?.todaySeconds ?? 0) / 60)
  const progress = Math.min(1, (streak?.todaySeconds ?? 0) / DAILY_GOAL_SECONDS)
  const circumference = 2 * Math.PI * 42

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <section className="col-span-2 rounded-3xl bg-primary p-6 text-[var(--color-surface)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-85">
          Situación del día · {CONTEXT_LABEL[situation.context]}
        </p>
        <p className="mt-3 font-display text-2xl leading-snug sm:text-3xl">{situation.situation}</p>
        <p className="mt-2 text-sm opacity-90">¿Cómo lo dirías en inglés? Dilo en voz alta antes de mirar.</p>

        {revealed ? (
          <div className="mt-5 rounded-2xl bg-[var(--color-surface)]/15 p-4">
            <p className="font-display text-xl">{situation.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => speak(situation.text, undefined, lang, 0.9)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--color-surface)] px-4 text-sm font-semibold text-primary"
              >
                <Volume2 size={16} /> Escuchar
              </button>
              <a
                href={`#shadowing?id=${situation.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-surface)]/60 px-4 text-sm font-semibold"
              >
                <AudioLines size={16} /> Imitarla
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-5 min-h-12 cursor-pointer rounded-full bg-[var(--color-surface)] px-6 font-semibold text-primary transition-transform active:scale-95"
          >
            Ya lo he dicho, enséñamelo
          </button>
        )}
      </section>

      <section className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--color-correct)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl leading-none text-[var(--ink)]">{minutes}</span>
            <span className="text-[11px]">de 20 min</span>
          </div>
        </div>
        <p className="text-center text-xs leading-snug">
          {progress >= 1 ? '¡Objetivo de hoy cumplido!' : 'Mejor 20 min al día que 5 horas el sábado'}
        </p>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <Flame size={26} className="text-primary" strokeWidth={1.75} />
        <div>
          <p className="font-mono text-4xl leading-none text-[var(--ink)]">{streak?.streak ?? 0}</p>
          <p className="mt-1 text-sm">{streak?.streak === 1 ? 'día seguido' : 'días seguidos'}</p>
        </div>
        <p className="text-xs leading-snug opacity-80">
          {streak?.freezeUsedThisWeek
            ? 'Esta semana ya usaste tu día libre. No pasa nada.'
            : 'Si un día fallas, la racha te perdona uno por semana.'}
        </p>
      </section>

      <a
        href={due.length ? '#frases?repasar' : '#frases'}
        className="group col-span-2 flex items-center gap-4 rounded-3xl bg-[var(--ink)] p-5 text-[var(--bg)] sm:col-span-1"
      >
        <span className="font-mono text-4xl leading-none">{due.length}</span>
        <span className="flex-1 text-sm leading-snug">
          {due.length ? 'frases para repasar en voz alta hoy' : 'Nada pendiente. Añade frases que oigas.'}
        </span>
        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
      </a>

      <section className="col-span-2 flex gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:col-span-1">
        <Headphones size={24} className="shrink-0 text-accent" strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">Inglés en tu día</p>
          <p className="mt-1 text-sm leading-relaxed">{tip}</p>
        </div>
      </section>

      <a
        href="#shadowing"
        className="col-span-2 flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-primary font-semibold text-primary transition-colors hover:bg-primary-soft"
      >
        <AudioLines size={18} /> Empezar sesión de shadowing
      </a>
    </div>
  )
}
