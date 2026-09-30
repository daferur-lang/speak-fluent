import { Lock } from 'lucide-react'
import clsx from 'clsx'
import { promptsByLevel } from '../data/prompts'
import { CEFR_LEVELS } from '../types'
import type { CEFRLevel } from '../types'

interface LevelBarProps {
  activeLevel: CEFRLevel
  unlockedLevel: CEFRLevel
  onSelect: (level: CEFRLevel) => void
  completedCount: (level: CEFRLevel) => number
  disabled?: boolean
}

export function LevelBar({ activeLevel, unlockedLevel, onSelect, completedCount, disabled }: LevelBarProps) {
  const unlockedIndex = CEFR_LEVELS.indexOf(unlockedLevel)

  return (
    <div className="flex gap-2">
      {CEFR_LEVELS.map((level, i) => {
        const locked = i > unlockedIndex
        const active = level === activeLevel
        const total = promptsByLevel[level].length
        const done = completedCount(level)
        const mastered = done === total

        return (
          <button
            key={level}
            type="button"
            disabled={locked || disabled}
            onClick={() => onSelect(level)}
            aria-label={locked ? `${level} bloqueado` : `Practicar nivel ${level}`}
            aria-current={active ? 'true' : undefined}
            className={clsx(
              'flex-1 cursor-pointer rounded-xl border px-2 py-2 text-center transition-all duration-200',
              locked && 'cursor-not-allowed border-[var(--border)] bg-[var(--surface)] opacity-40',
              !locked && !active && 'border-[var(--border)] bg-[var(--surface)] hover:border-primary',
              active && 'border-primary bg-primary text-[var(--color-surface)] shadow-sm',
            )}
          >
            <span className="flex items-center justify-center gap-1 font-display text-sm font-semibold">
              {locked && <Lock size={12} strokeWidth={2} />}
              {level}
            </span>
            {!locked && (
              <span
                className={clsx(
                  'mt-0.5 block font-mono text-[11px]',
                  active ? 'text-[var(--color-surface)]/85' : mastered ? 'text-correct' : 'text-[var(--body-text)]/70',
                )}
              >
                {done}/{total}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
