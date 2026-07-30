import { describe, it, expect } from 'vitest'
import {
  buildWall,
  buildShuffledWall,
  deal,
  toCounts,
  suitOf,
  numOf,
  isJoker,
  isFlower,
  isWind,
  isDragon,
  isHonor,
  DRAGON_FOR_SUIT,
  SUIT_FOR_DRAGON,
} from '../tiles'
import { mulberry32 } from '../rng'

describe('tile set', () => {
  it('builds exactly 152 tiles', () => {
    expect(buildWall()).toHaveLength(152)
  })

  it('has the correct composition', () => {
    const counts = toCounts(buildWall())
    // 27 numbered kinds x 4 copies
    for (const s of ['B', 'C', 'D']) {
      for (let n = 1; n <= 9; n++) expect(counts.get(`${s}${n}`)).toBe(4)
    }
    for (const w of ['WN', 'WE', 'WS', 'WW']) expect(counts.get(w)).toBe(4)
    for (const d of ['DR', 'DG', 'DW']) expect(counts.get(d)).toBe(4)
    expect(counts.get('F')).toBe(8)
    expect(counts.get('J')).toBe(8)
  })

  it('gives every tile a unique id', () => {
    const ids = new Set(buildWall().map((t) => t.id))
    expect(ids.size).toBe(152)
  })
})

describe('kind predicates', () => {
  it('classifies kinds correctly', () => {
    expect(suitOf('B5')).toBe('B')
    expect(numOf('B5')).toBe(5)
    expect(isJoker('J')).toBe(true)
    expect(isFlower('F')).toBe(true)
    expect(isWind('WN')).toBe(true)
    expect(isDragon('DR')).toBe(true)
    expect(isHonor('WN')).toBe(true)
    expect(isHonor('DR')).toBe(true)
    expect(isHonor('B5')).toBe(false)
    expect(suitOf('WN')).toBeNull()
    expect(numOf('J')).toBeNull()
  })

  it('has consistent dragon<->suit tables', () => {
    expect(DRAGON_FOR_SUIT.B).toBe('G')
    expect(DRAGON_FOR_SUIT.C).toBe('R')
    expect(DRAGON_FOR_SUIT.D).toBe('W')
    for (const s of ['B', 'C', 'D'] as const) {
      expect(SUIT_FOR_DRAGON[DRAGON_FOR_SUIT[s]]).toBe(s)
    }
  })
})

describe('deal', () => {
  it('gives the dealer 14 and others 13, conserving all tiles', () => {
    const wall = buildShuffledWall(mulberry32(42))
    const { hands, wall: rest } = deal(wall)
    expect(hands[0]).toHaveLength(14)
    expect(hands[1]).toHaveLength(13)
    expect(hands[2]).toHaveLength(13)
    expect(hands[3]).toHaveLength(13)
    expect(rest).toHaveLength(99)
    const total = hands.flat().length + rest.length
    expect(total).toBe(152)
  })

  it('is deterministic for a given seed', () => {
    const a = deal(buildShuffledWall(mulberry32(7))).hands[0].map((t) => t.kind)
    const b = deal(buildShuffledWall(mulberry32(7))).hands[0].map((t) => t.kind)
    expect(a).toEqual(b)
  })
})
