import { useState } from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { CONTEXTS, type Accent, type ContextId } from '../data/contexts'
import type { Profile } from '../hooks/useProfile'

const PRINCIPLES = [
  ['Hablas desde el minuto uno', 'Aquí no hay lecciones de gramática. Se aprende produciendo.'],
  ['Imitas a nativos', 'Shadowing: copias ritmo y melodía, como en un gimnasio del inglés.'],
  ['Te grabas y te escuchas', 'Tu propia voz es tu mejor material de estudio.'],
  ['Fallar es entrenar', 'Como llegar al fallo en el gimnasio: así se crece.'],
] as const

interface OnboardingProps {
  onDone: (profile: Profile) => void
  /** When editing an existing profile: skip the intro and keep the current choices. */
  initial?: Profile
}

export function Onboarding({ onDone, initial }: OnboardingProps) {
  const [step, setStep] = useState(initial ? 1 : 0)
  const [contexts, setContexts] = useState<ContextId[]>(initial?.contexts ?? [])
  const [accent, setAccent] = useState<Accent>(initial?.accent ?? 'us')

  const toggle = (id: ContextId) => setContexts((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]))

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Speak Fluent</p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={clsx('h-1 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-[var(--border)]')} />
        ))}
      </div>

      {step === 0 && (
        <section className="mt-8 flex flex-1 flex-col">
          <h1 className="text-4xl leading-tight">Deja de estudiar inglés. Empieza a hablarlo.</h1>
          <ol className="mt-8 flex flex-col gap-5">
            {PRINCIPLES.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <div>
                  <p className="font-semibold text-[var(--ink)]">{title}</p>
                  <p className="text-sm">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-l-2 border-accent pl-4 text-sm italic">20 minutos al día valen más que 5 horas un sábado.</p>
          <PrimaryButton onClick={() => setStep(1)}>Empezar</PrimaryButton>
        </section>
      )}

      {step === 1 && (
        <section className="mt-8 flex flex-1 flex-col">
          <h1 className="text-3xl leading-tight">¿Para qué quieres el inglés?</h1>
          <p className="mt-2 text-sm">Tu cerebro guarda lo que le sirve. Practicarás frases de tu vida, no de un libro. Elige uno o más.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {CONTEXTS.map(({ id, label, icon: Icon }) => {
              const on = contexts.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={on}
                  className={clsx(
                    'relative flex min-h-24 cursor-pointer flex-col items-start justify-between rounded-2xl border-2 p-4 text-left font-semibold transition-colors',
                    on ? 'border-primary bg-primary-soft text-primary' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-primary',
                  )}
                >
                  <Icon size={22} strokeWidth={1.75} />
                  {label}
                  {on && <Check size={18} className="absolute right-3 top-3" />}
                </button>
              )
            })}
          </div>
          <PrimaryButton disabled={contexts.length === 0} onClick={() => setStep(2)}>
            Siguiente
          </PrimaryButton>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 flex flex-1 flex-col">
          <h1 className="text-3xl leading-tight">¿Qué acento quieres imitar?</h1>
          <p className="mt-2 text-sm">Empieza por uno estándar y fácil de seguir. Podrás cambiarlo más tarde.</p>
          <div className="mt-6 flex flex-col gap-3">
            {(
              [
                ['us', 'Americano', 'El de la mayoría de series y podcasts.'],
                ['gb', 'Británico', 'Estándar del Reino Unido.'],
              ] as const
            ).map(([id, label, desc]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAccent(id)}
                aria-pressed={accent === id}
                className={clsx(
                  'flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border-2 px-5 text-left transition-colors',
                  accent === id ? 'border-primary bg-primary-soft' : 'border-[var(--border)] bg-[var(--surface)] hover:border-primary',
                )}
              >
                <span>
                  <span className="block font-semibold text-[var(--ink)]">{label}</span>
                  <span className="text-sm">{desc}</span>
                </span>
                {accent === id && <Check size={20} className="text-primary" />}
              </button>
            ))}
          </div>
          <PrimaryButton
            onClick={() => {
              onDone({ contexts, accent })
              if (!initial) window.location.hash = 'shadowing'
            }}
          >
            {initial ? 'Guardar' : 'Hacer mi primer shadowing'}
          </PrimaryButton>
        </section>
      )}
    </div>
  )
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-auto pt-8">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="min-h-14 w-full cursor-pointer rounded-full bg-primary font-semibold text-[var(--color-surface)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </button>
    </div>
  )
}
