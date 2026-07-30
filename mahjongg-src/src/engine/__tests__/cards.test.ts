import { describe, it, expect } from 'vitest'
import { HANDS, validate, resolveNum, usesN, maxOffset } from '../cards'

describe('card definitions', () => {
  it('passes all structural invariants', () => {
    expect(validate(HANDS)).toEqual([])
  })

  it('every hand totals 14 tiles', () => {
    for (const def of HANDS) {
      const total = def.groups.reduce((s, g) => s + g.size, 0)
      expect(total, def.id).toBe(14)
    }
  })

  it('never allows jokers on pairs, singles, or flowers', () => {
    for (const def of HANDS) {
      for (const g of def.groups) {
        if (g.size < 3 || g.kind === 'flower') expect(g.jokerOK, def.id).toBe(false)
      }
    }
  })

  it('covers all nine NMJL sections', () => {
    const sections = new Set(HANDS.map((h) => h.section))
    for (const s of [
      '2026',
      '2468',
      '369',
      '13579',
      'Consecutive Run',
      'Winds & Dragons',
      'Any Like Numbers',
      'Quints',
      'Singles & Pairs',
    ]) {
      expect(sections.has(s), s).toBe(true)
    }
  })

  it('resolves number specs and rejects out-of-range', () => {
    expect(resolveNum(5, 3)).toBe(5)
    expect(resolveNum('n', 3)).toBe(3)
    expect(resolveNum('n+2', 3)).toBe(5)
    expect(resolveNum('n+2', 8)).toBeNull() // 10 is out of range
    expect(resolveNum('n', 0)).toBeNull()
  })

  it('computes maxOffset / usesN', () => {
    const run = HANDS.find((h) => h.id === 'RUN-6')!
    expect(usesN(run)).toBe(true)
    expect(maxOffset(run)).toBe(3)
    const year = HANDS.find((h) => h.id === 'YEAR-1')!
    expect(usesN(year)).toBe(false)
  })
})
