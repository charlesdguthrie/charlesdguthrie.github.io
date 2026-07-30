// Lightweight CSS-only confetti burst — no canvas, no npm dependency. A handful of
// absolutely-positioned divs animated via CSS keyframes (see .confetti-piece in
// App.css), each with randomized color/timing/drift/rotation.
import { useMemo, type CSSProperties } from 'react'
import { makeConfettiPieces } from './confettiPieces'

interface ConfettiProps {
  count?: number
}

export function Confetti({ count = 50 }: ConfettiProps) {
  // Reseed each mount so replays don't look identical, while still keeping the
  // generator itself pure and deterministic for a given seed.
  const seed = useMemo(() => Math.floor(Math.random() * 1e9) || 1, [])
  const pieces = useMemo(() => makeConfettiPieces(count, seed), [count, seed])

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => {
        const style: CSSProperties & Record<'--drift' | '--rot', string> = {
          left: `${p.left}%`,
          width: p.width,
          height: p.height,
          backgroundColor: p.color,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          '--drift': `${p.drift}px`,
          '--rot': `${p.rotation}deg`,
        }
        return <span key={p.id} className="confetti-piece" style={style} />
      })}
    </div>
  )
}
