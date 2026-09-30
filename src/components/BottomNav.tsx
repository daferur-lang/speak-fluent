import { AudioLines, BookmarkCheck, MessagesSquare, Sun } from 'lucide-react'
import clsx from 'clsx'
import type { Route } from '../hooks/useRoute'

const ITEMS: { route: Route; label: string; icon: typeof Sun }[] = [
  { route: 'hoy', label: 'Hoy', icon: Sun },
  { route: 'shadowing', label: 'Shadowing', icon: AudioLines },
  { route: 'conversar', label: 'Conversar', icon: MessagesSquare },
  { route: 'frases', label: 'Mis frases', icon: BookmarkCheck },
]

export function BottomNav({ route, dueCount }: { route: Route; dueCount: number }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map(({ route: target, label, icon: Icon }) => {
          const active = route === target
          return (
            <li key={target}>
              <a
                href={`#${target}`}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200',
                  active ? 'text-primary' : 'text-[var(--body-text)] hover:text-[var(--ink)]',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                {label}
                {target === 'frases' && dueCount > 0 && (
                  <span className="absolute right-[calc(50%-22px)] top-2 min-w-5 rounded-full bg-primary px-1.5 text-center font-mono text-[10px] leading-5 text-[var(--color-surface)]">
                    {dueCount}
                  </span>
                )}
                {active && <span className="absolute top-0 h-[3px] w-10 rounded-b bg-primary" aria-hidden="true" />}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
