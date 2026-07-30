// AI opponents. Every decision is a pure function of information the AI could
// legitimately know: its own concealed tiles plus public state (discards,
// opponents' exposures). The AI never inspects the wall or other players' hands.
//
// The heuristics are intentionally simple and readable over strong. A single
// DIFFICULTY object collects the tuning knobs.

import { closenessEx, type Closeness } from './match'
import { isJoker, type Tile } from './tiles'
import type { Player } from './state'

export const DIFFICULTY = {
  /**
   * When ranking candidate target hands (all within this many tiles of the closest
   * one), prefer whichever needs fewer *unjokerable* tiles (bare pairs/singles,
   * which can only ever be completed by drawing the exact natural — never by a
   * joker or a called meld). Chasing a hand that dead-ends on a natural-only pair
   * is the single biggest cause of wall games once the wall thins out, so this
   * lets the AI hedge toward more forgiving targets without needing to track a
   * persistent "committed" target across turns.
   */
  targetHysteresis: 2,
}

/** How many of a hand's still-needed tiles can *never* be filled by a joker. */
function unjokerableNeed(c: Closeness): number {
  return c.need.filter((n) => !n.jokerOK).reduce((sum, n) => sum + n.count, 0)
}

/**
 * Among the candidates within `targetHysteresis` tiles of the closest one, pick the
 * most forgiving: fewest tiles that can only be completed by an exact natural draw.
 * Falls back to the single closest candidate when there's no meaningful choice.
 */
function pickForgivingTarget(ranked: Closeness[]): Closeness | undefined {
  if (ranked.length === 0) return undefined
  const bestDistance = ranked[0].distance
  const inWindow = ranked.filter((c) => c.distance <= bestDistance + DIFFICULTY.targetHysteresis)
  return inWindow.reduce((best, c) =>
    unjokerableNeed(c) < unjokerableNeed(best) ? c : best,
  )
}

/** The hand the AI is currently aiming for (closest by tiles needed, ties broken
 * toward whichever is least dependent on drawing an exact natural tile). */
export function chooseTarget(p: Player): Closeness | null {
  const ranked = closenessEx(p.hand, p.exposures, 6)
  return pickForgivingTarget(ranked) ?? null
}

/**
 * Choose a tile to discard: the one whose removal leaves the hand closest to some
 * legal hand (i.e. the least useful tile), preferring to stay aimed at forgiving
 * (joker-fillable) hands over ones that dead-end on a natural-only pair. Never
 * discards a joker.
 */
export function chooseDiscard(p: Player): Tile {
  const candidates = p.hand.filter((t) => !isJoker(t.kind))
  // If somehow only jokers remain, discard anything.
  const pool = candidates.length > 0 ? candidates : p.hand

  let best: Tile = pool[0]
  let bestMatched = -1
  // Evaluate each *distinct* kind once (same-kind tiles are interchangeable).
  const seen = new Set<string>()
  for (const tile of pool) {
    if (seen.has(tile.kind)) continue
    seen.add(tile.kind)
    const without = p.hand.filter((t) => t.id !== tile.id)
    const ranked = closenessEx(without, p.exposures, 6)
    const matched = pickForgivingTarget(ranked)?.matched ?? 0
    if (matched > bestMatched) {
      bestMatched = matched
      best = tile
    }
  }
  return best
}

/** For the dev panel / debugging: describe what the AI is going for. */
export function describeTarget(p: Player): string {
  const t = chooseTarget(p)
  if (!t) return '—'
  return `${t.def.section} (${t.distance} away)`
}

/**
 * Choose `count` tiles to pass during a Charleston or courtesy pass: the least
 * useful tiles toward the closest hand, picked greedily one at a time (never
 * jokers — passing a joker is illegal). Mirrors chooseDiscard's heuristic,
 * iterated so the three picks are distinct kinds where possible.
 */
export function chooseCharlestonPass(p: Player, count = 3): Tile[] {
  let remaining = p.hand.slice()
  const picked: Tile[] = []
  for (let i = 0; i < count; i++) {
    const candidates = remaining.filter((t) => !isJoker(t.kind))
    const pool = candidates.length > 0 ? candidates : remaining
    let best: Tile = pool[0]
    let bestMatched = -1
    const seen = new Set<string>()
    for (const tile of pool) {
      if (seen.has(tile.kind)) continue
      seen.add(tile.kind)
      const without = remaining.filter((t) => t.id !== tile.id)
      const ranked = closenessEx(without, p.exposures, 6)
      const matched = pickForgivingTarget(ranked)?.matched ?? 0
      if (matched > bestMatched) {
        bestMatched = matched
        best = tile
      }
    }
    picked.push(best)
    remaining = remaining.filter((t) => t.id !== best.id)
  }
  return picked
}

export type { Closeness }
