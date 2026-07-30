// Seeded pseudo-random number generator.
//
// The entire game is deterministic given a seed: shuffles, deals, and every AI
// decision draw randomness from an RNG stored in game state. That makes any game
// perfectly reproducible from its seed (`?seed=` URL param / dev panel) — the
// single most valuable property for debugging a card game.

export type RNG = () => number

/** mulberry32 — tiny, fast, good-enough 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [0, n). */
export function randInt(rng: RNG, n: number): number {
  return Math.floor(rng() * n)
}

/** In-place Fisher–Yates shuffle using the supplied RNG. Returns the same array. */
export function shuffle<T>(arr: T[], rng: RNG): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Derive a fresh seed from a string (e.g. for naming games). */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
