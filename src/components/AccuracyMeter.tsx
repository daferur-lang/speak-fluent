const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function colorFor(accuracy: number): string {
  if (accuracy >= 80) return 'var(--color-correct)'
  if (accuracy >= 50) return 'var(--color-accent)'
  return 'var(--color-extra)'
}

export function AccuracyMeter({ accuracy }: { accuracy: number }) {
  const offset = CIRCUMFERENCE - (accuracy / 100) * CIRCUMFERENCE
  const color = colorFor(accuracy)

  return (
    <div className="relative flex h-20 w-20 items-center justify-center shrink-0">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-bold text-[var(--ink)]">{accuracy}%</span>
    </div>
  )
}
