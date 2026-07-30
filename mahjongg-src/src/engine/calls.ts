// Call-window logic: after a discard, every other seat may claim it — either to
// complete a Mah Jongg or to expose a meld (pung/kong/quint) that fits some card
// hand. This module is pure and framework-free; it operates on a minimal duck-typed
// player shape so it never needs to import from state.ts (which imports THIS module
// to build its reducer — importing back would create a cycle).

import { describeKind, isJoker, type Meld, type MeldType, type Tile, type TileKind } from './tiles'
import { closenessEx, findWin, groupExists } from './match'

/** The minimal shape calls.ts needs from a player — satisfied structurally by Player. */
export interface CallablePlayer {
  seat: number
  hand: Tile[]
  exposures: Meld[]
}

export type CallIntent =
  | { seat: number; kind: 'MAHJONG' }
  | { seat: number; kind: 'EXPOSE'; meld: Meld }
  | { seat: number; kind: 'PASS' }

const MELD_TYPE_FOR_SIZE: Record<3 | 4 | 5, MeldType> = { 3: 'pung', 4: 'kong', 5: 'quint' }

/**
 * Every legal meld a player could form by calling this discard: one candidate per
 * size (pung/kong/quint), preferring the fewest jokers for a given size. A size is
 * only offered if some card hand actually has a group of that kind+size that would
 * accept the joker count used.
 */
export function legalExposures(p: CallablePlayer, discarded: Tile): Meld[] {
  const naturals = p.hand.filter((t) => t.kind === discarded.kind)
  const jokers = p.hand.filter((t) => isJoker(t.kind))
  const out: Meld[] = []

  for (const size of [3, 4, 5] as const) {
    const need = size - 1 // tiles needed from hand, besides the discard itself
    const maxNatural = Math.min(need, naturals.length)
    const minNatural = Math.max(0, need - jokers.length)
    for (let naturalsUsed = maxNatural; naturalsUsed >= minNatural; naturalsUsed--) {
      const jokersUsed = need - naturalsUsed
      if (!groupExists(discarded.kind, size, jokersUsed)) continue
      out.push({
        type: MELD_TYPE_FOR_SIZE[size],
        kind: discarded.kind,
        tiles: [discarded, ...naturals.slice(0, naturalsUsed), ...jokers.slice(0, jokersUsed)],
      })
      break // fewest-jokers option for this size is enough to offer
    }
  }
  return out
}

/** Would calling this discard complete a valid Mah Jongg for the player? */
export function canCallMahjong(p: CallablePlayer, discarded: Tile): boolean {
  const exposureTiles = p.exposures.flatMap((m) => m.tiles)
  const all = [...p.hand, discarded, ...exposureTiles]
  return findWin(all, { hasExposures: p.exposures.length > 0 }) !== null
}

/** Remove the hand tiles consumed by a called meld (the discard itself isn't in hand). */
function withoutMeldTiles(hand: Tile[], meld: Meld, discarded: Tile): Tile[] {
  const usedIds = new Set(meld.tiles.filter((t) => t.id !== discarded.id).map((t) => t.id))
  return hand.filter((t) => !usedIds.has(t.id))
}

/**
 * AI call decision. Claims Mah Jongg outright. Otherwise, only calls an exposure if
 * it strictly improves closeness to *some* hand (never calls speculatively) —
 * conservative by construction, and never inspects anything but its own tiles.
 */
export function aiCallIntent(p: CallablePlayer, discarded: Tile, seat: number): CallIntent {
  if (canCallMahjong(p, discarded)) return { seat, kind: 'MAHJONG' }

  const before = closenessEx(p.hand, p.exposures, 1)[0]?.distance ?? 14
  let best: { meld: Meld; distance: number } | null = null
  for (const meld of legalExposures(p, discarded)) {
    const remainingHand = withoutMeldTiles(p.hand, meld, discarded)
    const distance = closenessEx(remainingHand, [...p.exposures, meld], 1)[0]?.distance ?? 14
    if (!best || distance < best.distance) best = { meld, distance }
  }
  if (best && best.distance < before) return { seat, kind: 'EXPOSE', meld: best.meld }
  return { seat, kind: 'PASS' }
}

/** Human-readable label for a call option, e.g. "Pung of 5 Bam". */
export function describeMeld(meld: Meld): string {
  return `${meld.type[0].toUpperCase()}${meld.type.slice(1)} of ${describeKind(meld.kind)}`
}

/** True if two melds reference the same physical tiles (used to validate UI actions). */
export function sameMeld(a: Meld, b: Meld): boolean {
  if (a.tiles.length !== b.tiles.length) return false
  const idsA = new Set(a.tiles.map((t) => t.id))
  return b.tiles.every((t) => idsA.has(t.id))
}

export type { TileKind }
