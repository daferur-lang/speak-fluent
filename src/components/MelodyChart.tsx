import type { Contour } from '../lib/pitch'

const WIDTH = 320
const HEIGHT = 120
const RANGE = 8 // ± semitones shown

function toPath(curve: Contour): string {
  let path = ''
  let penDown = false
  curve.forEach((st, i) => {
    if (st === null) {
      penDown = false
      return
    }
    const x = (i / Math.max(1, curve.length - 1)) * WIDTH
    const clamped = Math.max(-RANGE, Math.min(RANGE, st))
    const y = HEIGHT / 2 - (clamped / RANGE) * (HEIGHT / 2 - 8)
    path += `${penDown ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `
    penDown = true
  })
  return path
}

interface MelodyChartProps {
  reference: Contour | null
  user: Contour | null
}

/** Overlays the native speaker's melody and the learner's, by shape (semitones), not absolute pitch. */
export function MelodyChart({ reference, user }: MelodyChartProps) {
  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-32 w-full rounded-xl bg-[var(--bg)]"
        role="img"
        aria-label="Curva de entonación: la línea discontinua es el nativo y la continua eres tú"
        preserveAspectRatio="none"
      >
        <line x1="0" x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke="var(--border)" strokeWidth="1" />
        {reference && (
          <path
            d={toPath(reference)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeDasharray="6 5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {user && (
          <path
            d={toPath(user)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <figcaption className="mt-2 flex gap-5 text-xs text-[var(--body-text)]">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-5 border-t-[3px] border-dashed border-accent" /> Nativo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-5 border-t-[3px] border-primary" /> Tú
        </span>
        <span className="ml-auto opacity-70">sube = tono más agudo</span>
      </figcaption>
    </figure>
  )
}
