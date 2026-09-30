import { useState } from 'react'
import { CalendarClock, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { CONTEXTS, CONTEXT_LABEL, type ContextId } from '../data/contexts'
import { addPhrase, usePhrases } from '../hooks/usePhrases'
import { ReviewSession } from './frases/ReviewSession'
import type { UserPhrase } from '../lib/db'
import type { Profile } from '../hooks/useProfile'

function dueLabel(phrase: UserPhrase): string {
  const days = Math.ceil((new Date(phrase.card.due).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'toca hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

export function FrasesScreen({ profile }: { profile: Profile }) {
  const { phrases, due, loaded, update, remove } = usePhrases()
  const [reviewing, setReviewing] = useState(() => window.location.hash.includes('repasar'))
  const [adding, setAdding] = useState(false)

  if (reviewing) return <ReviewSession queue={due} profile={profile} onExit={() => setReviewing(false)} onGrade={update} />

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 rounded-2xl bg-[var(--ink)] p-5 text-[var(--bg)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <p className="font-mono text-5xl leading-none">{due.length}</p>
          <p className="mt-2 text-sm opacity-80">
            {due.length === 1 ? 'frase toca repasar hoy' : 'frases tocan repasar hoy'} · en voz alta, sin escribir
          </p>
        </div>
        <button
          type="button"
          disabled={due.length === 0}
          onClick={() => setReviewing(true)}
          className="min-h-12 cursor-pointer rounded-full bg-primary px-6 font-semibold text-[var(--color-surface)] transition-colors hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
        >
          {due.length ? 'Empezar repaso' : 'Todo al día'}
        </button>
      </section>

      {adding ? (
        <CaptureForm profile={profile} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] px-5 text-left font-semibold text-[var(--ink)] transition-colors hover:border-primary"
        >
          <Plus size={20} className="text-primary" />
          He oído una frase y quiero hacerla mía
        </button>
      )}

      <section>
        <h2 className="mb-3 text-xl">Tus frases</h2>
        {loaded && phrases.length === 0 && (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed">
            Aún no tienes frases. Añade una que hayas oído en una serie o un podcast, o guarda frases desde Shadowing con «Añadir a mis
            repasos».
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {phrases.map((phrase) => (
            <PhraseItem key={phrase.id} phrase={phrase} onSave={update} onDelete={() => remove(phrase.id)} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function PhraseItem({ phrase, onSave, onDelete }: { phrase: UserPhrase; onSave: (p: UserPhrase) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [own, setOwn] = useState(phrase.ownSentence)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-snug text-[var(--ink)]">{phrase.text}</p>
          <p className="text-sm">{phrase.es}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--bg)] px-2.5 py-1 font-mono text-[11px]">
          <CalendarClock size={12} /> {dueLabel(phrase)}
        </span>
      </div>

      {editing ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            await onSave({ ...phrase, ownSentence: own.trim() })
            setEditing(false)
          }}
        >
          <input
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder="Tu propia frase en inglés"
            aria-label="Tu propia frase en inglés"
            autoFocus
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-[var(--ink)]"
          />
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-[var(--color-surface)]">
            Guardar
          </button>
        </form>
      ) : phrase.ownSentence ? (
        <p className="mt-3 border-l-2 border-accent pl-3 text-sm italic">«{phrase.ownSentence}»</p>
      ) : null}

      <div className="mt-3 flex items-center gap-1 text-xs">
        <span className="mr-auto opacity-70">
          {CONTEXT_LABEL[phrase.context]} · {phrase.source || 'Mis frases'}
        </span>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2 hover:text-[var(--ink)]">
            <Pencil size={14} /> {phrase.ownSentence ? 'Mi frase' : 'Añadir mi frase'}
          </button>
        )}
        {confirmDelete ? (
          <>
            <button type="button" onClick={onDelete} className="min-h-9 cursor-pointer rounded-lg px-2 font-semibold text-extra">
              Borrar
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} aria-label="Cancelar" className="min-h-9 cursor-pointer rounded-lg px-2">
              <X size={14} />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Borrar frase" className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2 hover:text-extra">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </li>
  )
}

function CaptureForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [text, setText] = useState('')
  const [es, setEs] = useState('')
  const [own, setOwn] = useState('')
  const [source, setSource] = useState('')
  const [context, setContext] = useState<ContextId>(profile.contexts[0])
  const [saving, setSaving] = useState(false)
  const valid = text.trim() && es.trim() && own.trim()
  const field = 'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-[var(--ink)]'

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid) return
        setSaving(true)
        await addPhrase({ text: text.trim(), es: es.trim(), ownSentence: own.trim(), source: source.trim(), context })
        onDone()
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Hazla tuya</h2>
        <button type="button" onClick={onDone} aria-label="Cerrar" className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--bg)]">
          <X size={18} />
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        1. La frase que oíste (en inglés)
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="I'm gonna grab a coffee" className={field} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        <span className="flex items-center justify-between">
          2. Tradúcela una sola vez
          {text.trim() && (
            <a
              href={`https://translate.google.com/?sl=en&tl=es&text=${encodeURIComponent(text.trim())}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-normal text-primary"
            >
              ¿Dudas? <ExternalLink size={12} />
            </a>
          )}
        </span>
        <input value={es} onChange={(e) => setEs(e.target.value)} placeholder="Voy a por un café" className={field} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        3. Úsala en una frase tuya, de tu vida
        <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Before the meeting I'm gonna grab a coffee" className={field} />
        <span className="text-xs font-normal opacity-70">Es lo que hace que se te quede: bajarla a tierra.</span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">¿De qué tema es?</legend>
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setContext(c.id)}
              aria-pressed={context === c.id}
              className={clsx(
                'min-h-9 cursor-pointer rounded-full border px-3 text-sm',
                context === c.id ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-[var(--border)]',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        ¿Dónde la oíste? <span className="font-normal opacity-70">(opcional)</span>
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Podcast, serie, canción…" className={field} />
      </label>

      <button
        type="submit"
        disabled={!valid || saving}
        className="min-h-12 cursor-pointer rounded-full bg-primary font-semibold text-[var(--color-surface)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar y repasarla
      </button>
    </form>
  )
}
