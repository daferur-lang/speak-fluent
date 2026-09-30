import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { InstallBanner } from './components/InstallBanner'
import { ThemeToggle } from './components/ThemeToggle'
import { usePracticeTimer } from './hooks/useHabit'
import { usePhrases } from './hooks/usePhrases'
import { useProfile } from './hooks/useProfile'
import { useRoute, type Route } from './hooks/useRoute'
import { ConversarScreen } from './screens/ConversarScreen'
import { FrasesScreen } from './screens/FrasesScreen'
import { HoyScreen } from './screens/HoyScreen'
import { Onboarding } from './screens/Onboarding'
import { ShadowingScreen } from './screens/ShadowingScreen'

const TITLES: Record<Route, string> = {
  hoy: 'Tu inglés de hoy',
  shadowing: 'El gimnasio del inglés',
  conversar: 'Tu compañero de conversación',
  frases: 'Frases que haces tuyas',
}

function App() {
  const { profile, setProfile } = useProfile()
  const route = useRoute()
  const { due } = usePhrases()
  const [editingProfile, setEditingProfile] = useState(false)
  usePracticeTimer(!!profile && !editingProfile && route !== 'hoy')

  if (!profile) return <Onboarding onDone={setProfile} />
  if (editingProfile) {
    return (
      <Onboarding
        initial={profile}
        onDone={(next) => {
          setProfile(next)
          setEditingProfile(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Speak Fluent</p>
          <h1 className="text-2xl leading-tight sm:text-3xl">{TITLES[route]}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            aria-label="Cambiar mis temas y acento"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition-colors duration-200 hover:border-primary"
          >
            <SlidersHorizontal size={18} strokeWidth={1.75} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
        <InstallBanner />
        {route === 'hoy' && <HoyScreen profile={profile} />}
        {route === 'shadowing' && <ShadowingScreen profile={profile} />}
        {route === 'conversar' && <ConversarScreen />}
        {route === 'frases' && <FrasesScreen profile={profile} />}
      </main>

      <BottomNav route={route} dueCount={due.length} />
    </div>
  )
}

export default App
