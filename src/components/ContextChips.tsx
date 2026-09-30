import clsx from 'clsx'
import { CONTEXTS, type ContextFilter } from '../data/contexts'

interface ContextChipsProps {
  value: ContextFilter
  onChange: (value: ContextFilter) => void
}

export function ContextChips({ value, onChange }: ContextChipsProps) {
  const options: { id: ContextFilter; label: string }[] = [
    { id: 'mine', label: 'Mis temas' },
    ...CONTEXTS.map((c) => ({ id: c.id as ContextFilter, label: c.label })),
    { id: 'all', label: 'Todo' },
  ]

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={clsx(
            'min-h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm transition-colors duration-200',
            value === option.id
              ? 'border-primary bg-primary-soft text-primary font-semibold'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--body-text)] hover:border-primary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
