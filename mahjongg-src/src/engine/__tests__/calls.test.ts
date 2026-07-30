import { describe, it, expect } from 'vitest'
import { legalExposures, canCallMahjong, aiCallIntent, describeMeld, sameMeld } from '../calls'
import type { Tile, TileKind } from '../tiles'
import type { Meld } from '../tiles'

let _id = 500000
const tiles = (...kinds: TileKind[]): Tile[] => kinds.map((kind) => ({ id: _id++, kind }))
const player = (hand: Tile[], exposures: Meld[] = [], seat = 1) => ({ seat, hand, exposures })

describe('legalExposures', () => {
  it('offers a pung when two naturals are held', () => {
    const p = player(tiles('B5', 'B5', 'C1', 'C2'))
    const discard = tiles('B5')[0]
    const options = legalExposures(p, discard)
    expect(options).toHaveLength(1)
    expect(options[0].type).toBe('pung')
    expect(options[0].tiles).toHaveLength(3)
    expect(options[0].tiles.filter((t) => t.kind === 'J')).toHaveLength(0)
  })

  it('offers a pung (fewest jokers) and a kong when jokers are held', () => {
    const p = player(tiles('B5', 'J', 'J'))
    const discard = tiles('B5')[0]
    const options = legalExposures(p, discard)
    const byType = Object.fromEntries(options.map((o) => [o.type, o]))
    expect(byType.pung).toBeDefined()
    expect(byType.pung.tiles.filter((t) => t.kind === 'J')).toHaveLength(1)
    expect(byType.kong).toBeDefined()
    expect(byType.kong.tiles.filter((t) => t.kind === 'J')).toHaveLength(2)
    expect(byType.quint).toBeUndefined() // not enough tiles for 5
  })

  it('offers nothing when the player holds no matching tiles', () => {
    const p = player(tiles('C1', 'C2', 'D9'))
    const discard = tiles('B5')[0]
    expect(legalExposures(p, discard)).toEqual([])
  })

  it('never offers a group no hand definition actually has', () => {
    // Winds have no quint on the card (no HandDef needs 5 of a wind); confirm we
    // never fabricate an illegal quint option even with ample jokers.
    const p = player(tiles('WN', 'WN', 'WN', 'J', 'J', 'J', 'J'))
    const discard = tiles('WN')[0]
    const options = legalExposures(p, discard)
    expect(options.some((o) => o.type === 'quint')).toBe(false)
  })
})

describe('canCallMahjong', () => {
  it('is true when the discard completes a hand', () => {
    // EVEN-1 minus one B8: pung2 + pung4 + kong6 + B8,B8,B8 (13 tiles) + discard B8.
    const hand = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    const p = player(hand)
    expect(canCallMahjong(p, tiles('B8')[0])).toBe(true)
  })

  it('is false for an unrelated discard', () => {
    const hand = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    const p = player(hand)
    expect(canCallMahjong(p, tiles('C9')[0])).toBe(false)
  })
})

describe('aiCallIntent', () => {
  it('claims mah jongg over any exposure opportunity', () => {
    const hand = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    const p = player(hand)
    const intent = aiCallIntent(p, tiles('B8')[0], 2)
    expect(intent).toEqual({ seat: 2, kind: 'MAHJONG' })
  })

  it('calls an exposure that strictly improves closeness (without completing the hand)', () => {
    // Pursuing EVEN-1 (pungs of 2,4 + kongs of 6,8, one suit): two naturals of 2
    // held, calling the third forms the pung but the hand still needs more (a 4th B6).
    const hand = tiles('B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8', 'B8', 'C1')
    const p = player(hand)
    const intent = aiCallIntent(p, tiles('B2')[0], 2)
    expect(intent.kind).toBe('EXPOSE')
    if (intent.kind === 'EXPOSE') expect(intent.meld.type).toBe('pung')
  })

  it('passes when no legal exposure exists', () => {
    const p = player(tiles('C1', 'C2', 'D9'))
    const intent = aiCallIntent(p, tiles('B5')[0], 2)
    expect(intent).toEqual({ seat: 2, kind: 'PASS' })
  })

  it('passes on a speculative call that does not improve closeness', () => {
    // A scattered hand with no coherent target; calling a random pung of 1s
    // doesn't get any hand closer, so a conservative AI should pass.
    const hand = tiles('C1', 'C1', 'D3', 'D5', 'D7', 'WN', 'WE', 'WS', 'WW', 'DR', 'DG', 'DW', 'F')
    const p = player(hand)
    const intent = aiCallIntent(p, tiles('C1')[0], 2)
    expect(intent.kind).toBe('PASS')
  })
})

describe('describeMeld / sameMeld', () => {
  it('produces a readable label', () => {
    const meld: Meld = { type: 'pung', kind: 'B5', tiles: tiles('B5', 'B5', 'B5') }
    expect(describeMeld(meld)).toBe('Pung of 5 Bam')
  })

  it('compares melds by tile identity', () => {
    const t = tiles('B5', 'B5', 'B5')
    const a: Meld = { type: 'pung', kind: 'B5', tiles: t }
    const b: Meld = { type: 'pung', kind: 'B5', tiles: t.slice() }
    const c: Meld = { type: 'pung', kind: 'B5', tiles: tiles('B5', 'B5', 'B5') } // different ids
    expect(sameMeld(a, b)).toBe(true)
    expect(sameMeld(a, c)).toBe(false)
  })
})
