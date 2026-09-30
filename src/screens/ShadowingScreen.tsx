import { useState } from 'react'
import clsx from 'clsx'
import { hashParams } from '../hooks/useRoute'
import { ImitarPanel } from './shadowing/ImitarPanel'
import { EspejoPanel } from './shadowing/EspejoPanel'
import type { Profile } from '../hooks/useProfile'

type Mode = 'imitar' | 'espejo'

export function ShadowingScreen({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<Mode>(() => (hashParams().get('modo') === 'espejo' ? 'espejo' : 'imitar'))

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Tipo de ejercicio" className="grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
        {(
          [
            ['imitar', 'Imitar a un nativo'],
            ['espejo', 'Espejo: leer en voz alta'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={clsx(
              'min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold transition-colors duration-200',
              mode === id ? 'bg-primary text-[var(--color-surface)]' : 'text-[var(--body-text)] hover:text-[var(--ink)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'imitar' ? <ImitarPanel profile={profile} /> : <EspejoPanel profile={profile} />}
    </div>
  )
}
