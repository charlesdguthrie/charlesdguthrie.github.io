// Pure confetti-particle generation, kept separate from the Confetti component
// so oxlint's react-refresh rule is happy (components-only files) and so this
// logic is trivially unit-testable in isolation.

const COLORS = ['#e8c86a', '#1f8a3b', '#c0392b', '#2565c7', '#fff5d6', '#d81b8c', '#f0d585']

export interface ConfettiPiece {
  id: number
  left: number // percent across the container
  delay: number // seconds before the fall starts
  duration: number // seconds the fall takes
  rotation: number // degrees rotated by the end of the fall
  drift: number // horizontal drift in px by the end of the fall
  width: number // px
  height: number // px
  color: string
}

// Tiny deterministic PRNG (mulberry32-style) so particle generation is a pure,
// testable function rather than reaching for Math.random() directly.
function makeRand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pure particle generator, kept separate from rendering so it's unit-testable. */
export function makeConfettiPieces(count = 50, seed = 1): ConfettiPiece[] {
  const rand = makeRand(seed)
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: rand() * 0.5,
    duration: 2.1 + rand() * 1.6,
    rotation: 180 + rand() * 540,
    drift: (rand() - 0.5) * 180,
    width: 6 + rand() * 6,
    height: 10 + rand() * 8,
    color: COLORS[Math.floor(rand() * COLORS.length)],
  }))
}
