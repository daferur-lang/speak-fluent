import { AlertTriangle, Loader2, Mic, Sparkles, Volume2 } from 'lucide-react'
import type { ConversationStatus } from '../hooks/useConversation'

const STATUS_COPY: Record<ConversationStatus, { label: string; icon: typeof Mic }> = {
  idle: { label: 'Toca el micrófono para hablar', icon: Mic },
  listening: { label: 'Escuchando...', icon: Mic },
  scoring: { label: 'Comparando tu pronunciación...', icon: Sparkles },
  'ai-thinking': { label: 'Tu compañero está pensando...', icon: Loader2 },
  'ai-speaking': { label: 'Respondiendo...', icon: Volume2 },
  error: { label: 'Algo no ha ido bien', icon: AlertTriangle },
}

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const { label, icon: Icon } = STATUS_COPY[status]
  const spinning = status === 'ai-thinking'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--body-text)]">
      <Icon size={16} strokeWidth={1.75} className={spinning ? 'animate-spin' : ''} />
      <span>{label}</span>
    </div>
  )
}
