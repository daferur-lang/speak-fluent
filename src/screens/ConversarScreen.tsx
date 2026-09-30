import { AlertTriangle } from 'lucide-react'
import { useConversation } from '../hooks/useConversation'
import { useProgress } from '../hooks/useProgress'
import { MicButton } from '../components/MicButton'
import { StatusBadge } from '../components/StatusBadge'
import { SituationCard } from '../components/SituationCard'
import { WordFeedbackText } from '../components/WordFeedbackText'
import { AccuracyMeter } from '../components/AccuracyMeter'
import { TurnHistory } from '../components/TurnHistory'
import { Waveform } from '../components/Waveform'
import { LevelBar } from '../components/LevelBar'
import { LevelUpBanner } from '../components/LevelUpBanner'

const ERROR_COPY: Record<string, string> = {
  'unsupported-browser':
    'Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge en un ordenador o Android.',
  'not-allowed': 'Necesito permiso para usar tu micrófono. Revisa los permisos del navegador e inténtalo de nuevo.',
  'no-speech': 'No he escuchado nada. Acércate al micrófono e inténtalo otra vez.',
  'ai-request-failed':
    'No he podido conectar con tu compañero de conversación. Comprueba tu conexión e inténtalo de nuevo.',
}

export function ConversarScreen() {
  const { progress, recordResult, setActiveLevel, justLeveledUpTo, dismissLevelUp, levelCompletedCount } = useProgress()

  const { currentPrompt, status, errorMessage, history, startTurn, stopTurn, supported } = useConversation({
    activeLevel: progress.activeLevel,
    bestAccuracyByPromptId: progress.bestAccuracyByPromptId,
    onResult: recordResult,
  })

  const lastTurn = history[history.length - 1]
  const busy = status !== 'idle' && status !== 'error'

  return (
    <div className="flex flex-col gap-6">
      {!supported && (
        <div className="flex items-start gap-3 rounded-2xl border border-extra bg-extra-soft p-4 text-sm text-extra">
          <AlertTriangle size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>{ERROR_COPY['unsupported-browser']}</p>
        </div>
      )}

      {justLeveledUpTo && <LevelUpBanner level={justLeveledUpTo} onDismiss={dismissLevelUp} />}

      <LevelBar
        activeLevel={progress.activeLevel}
        unlockedLevel={progress.unlockedLevel}
        onSelect={setActiveLevel}
        completedCount={levelCompletedCount}
        disabled={busy}
      />

      <SituationCard prompt={currentPrompt} />

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-10">
        <MicButton status={status} onStart={startTurn} onStop={stopTurn} disabled={!supported} />
        <StatusBadge status={status} />
        <Waveform active={status === 'listening'} />

        {status === 'error' && errorMessage && (
          <p className="max-w-sm text-center text-sm text-extra">
            {ERROR_COPY[errorMessage] ?? 'Ha ocurrido un error. Inténtalo de nuevo.'}
          </p>
        )}

        {lastTurn && status === 'idle' && (
          <div className="mt-2 w-full border-t border-[var(--border)] px-6 pt-6">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--body-text)]/70">Lo que he escuchado</p>
                <WordFeedbackText words={lastTurn.words} />
              </div>
              <AccuracyMeter accuracy={lastTurn.accuracy} />
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl">Historial de práctica</h2>
        <TurnHistory history={history} />
      </section>
    </div>
  )
}
