const BAR_DELAYS = [0, 0.12, 0.24, 0.36, 0.48, 0.36, 0.24, 0.12]

export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-1 h-8" aria-hidden="true">
      {BAR_DELAYS.map((delay, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-primary"
          style={{
            height: active ? '100%' : '20%',
            animation: active ? `wave 0.9s ease-in-out ${delay}s infinite` : 'none',
            opacity: active ? 1 : 0.35,
            transition: 'opacity 200ms',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
