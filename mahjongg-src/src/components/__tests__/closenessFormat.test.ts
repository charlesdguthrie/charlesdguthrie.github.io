import { describe, it, expect } from 'vitest'
import { formatDistance, handKey } from '../closenessFormat'
import type { Meld, Tile } from '../../engine/tiles'

let _id = 900000
const tiles = (...kinds: string[]): Tile[] => kinds.map((kind) => ({ id: _id++, kind }))

describe('formatDistance', () => {
  it('reports readiness at distance 0', () => {
    expect(formatDistance(0)).toBe('Ready to win!')
  })

  it('uses singular "tile" for distance 1', () => {
    expect(formatDistance(1)).toBe('1 tile away')
  })

  it('uses plural "tiles" for distance > 1', () => {
    expect(formatDistance(2)).toBe('2 tiles away')
    expect(formatDistance(7)).toBe('7 tiles away')
  })
})

describe('handKey', () => {
  it('is stable across different array references with the same tile kinds', () => {
    const a = tiles('B1', 'B2', 'C3')
    const b = tiles('B1', 'B2', 'C3') // different ids, same kinds
    expect(handKey(a, [])).toBe(handKey(b, []))
  })

  it('is order-independent for concealed tiles', () => {
    const a = tiles('B1', 'B2', 'C3')
    const b = [a[2], a[0], a[1]]
    expect(handKey(a, [])).toBe(handKey(b, []))
  })

  it('changes when tile kinds differ', () => {
    const a = tiles('B1', 'B2', 'C3')
    const b = tiles('B1', 'B2', 'C4')
    expect(handKey(a, [])).not.toBe(handKey(b, []))
  })

  it('factors in exposures', () => {
    const hand = tiles('B1', 'B2', 'C3')
    const meld: Meld = { type: 'pung', kind: 'D5', tiles: tiles('D5', 'D5', 'D5') }
    expect(handKey(hand, [])).not.toBe(handKey(hand, [meld]))
  })
})
