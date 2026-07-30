import { describe, it, expect } from 'vitest'
import { tilesUsedForHand } from '../MahjongCard'
import { HANDS, type HandDef } from '../../engine/cards'
import type { Closeness } from '../../engine/match'
import type { Tile } from '../../engine/tiles'

let _id = 700000
const tiles = (...kinds: string[]): Tile[] => kinds.map((kind) => ({ id: _id++, kind }))

const findHand = (id: string): HandDef => {
  const def = HANDS.find((h) => h.id === id)
  if (!def) throw new Error(`fixture hand ${id} not found`)
  return def
}

describe('tilesUsedForHand', () => {
  it('claims natural tiles first, then spends jokers on any remaining shortfall', () => {
    const def = findHand('EVEN-5')
    const closeness: Closeness = {
      def,
      assignment: { S1: 'B', S2: 'C' },
      n: null,
      matched: 10,
      distance: 4,
      need: [{ kind: 'DG', count: 1, jokerOK: true }],
    }
    // Needs: B2x4, DGx3, C8x4, DRx3. Player holds 3 B2s, 2 DGs, 4 C8s, 3 DRs,
    // and one joker — one short on B2 and DG combined, only one joker to give.
    const concealed = tiles('B2', 'B2', 'B2', 'DG', 'DG', 'C8', 'C8', 'C8', 'C8', 'DR', 'DR', 'DR', 'J')
    const used = tilesUsedForHand(def, closeness, concealed)
    // Every natural tile that matches a required kind should be claimed.
    for (const t of concealed) {
      if (t.kind !== 'J') expect(used.has(t.id)).toBe(true)
    }
    // The single joker gets spent on whichever group is resolved first (B2,
    // per group order) — a documented simplification, not the "optimal" pick.
    const joker = concealed.find((t) => t.kind === 'J')!
    expect(used.has(joker.id)).toBe(true)
  })

  it('matches a free-pick dragon requirement against any dragon color held', () => {
    const def = findHand('ODD-16')
    const closeness: Closeness = { def, assignment: { S1: 'B' }, n: null, matched: 0, distance: 14, need: [] }
    // oppositeS1 dragon group needs 3; player holds 2 Red + 1 White dragons.
    const concealed = tiles('B1', 'B3', 'B5', 'B7', 'B7', 'B7', 'B9', 'B9', 'B9', 'DR', 'DR', 'DW', 'F', 'F')
    const used = tilesUsedForHand(def, closeness, concealed)
    const dr = concealed.filter((t) => t.kind === 'DR')
    const dw = concealed.filter((t) => t.kind === 'DW')
    for (const t of [...dr, ...dw]) expect(used.has(t.id)).toBe(true)
  })

  it('does not claim tiles of kinds the hand has no use for', () => {
    const def = findHand('EVEN-1') // single-suit hand, no dragons/winds/flowers
    const closeness: Closeness = { def, assignment: { S1: 'B' }, n: null, matched: 0, distance: 14, need: [] }
    const concealed = tiles('B2', 'B2', 'B2', 'WN', 'WN', 'DR')
    const used = tilesUsedForHand(def, closeness, concealed)
    const wind = concealed.find((t) => t.kind === 'WN')!
    const dragon = concealed.find((t) => t.kind === 'DR')!
    expect(used.has(wind.id)).toBe(false)
    expect(used.has(dragon.id)).toBe(false)
  })
})
