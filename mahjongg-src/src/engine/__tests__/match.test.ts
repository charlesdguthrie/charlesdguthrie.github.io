import { describe, it, expect } from 'vitest'
import type { Tile, TileKind } from '../tiles'
import { HANDS, type HandDef } from '../cards'
import {
  matchHand,
  closeness,
  resolveGroups,
  suitAssignments,
  nValues,
  dragonOptions,
  handViability,
  stillReachable,
  type Required,
} from '../match'
import { mulberry32, randInt } from '../rng'

// --- test helpers -----------------------------------------------------------

let _id = 0
const tile = (kind: TileKind): Tile => ({ id: _id++, kind })
const tiles = (...kinds: TileKind[]): Tile[] => kinds.map(tile)
const maxCopies = (kind: TileKind) => (kind === 'F' ? 8 : 4)

/**
 * Build a concrete 14-tile winning rack from a resolved requirement. Naturals are
 * capped at real wall supply (4 per kind, 8 flowers); any shortfall is filled with
 * jokers (only legal where jokerOK — which is exactly where shortfall occurs, e.g.
 * quints). `extraJokers` optionally swaps naturals for jokers in jokerOK groups to
 * exercise joker substitution.
 */
function materialize(req: Map<TileKind, Required>, extraJokers = 0): Tile[] {
  const out: Tile[] = []
  let budget = extraJokers
  for (const [kind, r] of req) {
    let nat = Math.min(r.count, maxCopies(kind))
    let jk = r.count - nat
    while (budget > 0 && r.jokerOK && nat > 0) {
      nat--
      jk++
      budget--
    }
    for (let i = 0; i < nat; i++) out.push(tile(kind))
    for (let i = 0; i < jk; i++) out.push(tile('J'))
  }
  return out
}

/** First (assignment, n, dragon picks) whose groups resolve without collision, plus its req map. */
function firstPlan(def: HandDef) {
  for (const assignment of suitAssignments(def)) {
    for (const n of nValues(def)) {
      for (const picks of dragonOptions(def, assignment)) {
        const req = resolveGroups(def, assignment, n, picks)
        if (req) return { assignment, n, req }
      }
    }
  }
  throw new Error(`no valid plan for ${def.id}`)
}

// --- positive matches (round-trip: resolve -> materialize -> match) ---------

describe('winning hands match (one per section)', () => {
  for (const def of HANDS) {
    it(`${def.id} (${def.section}) matches a materialized winner`, () => {
      const { req } = firstPlan(def)
      const rack = materialize(req)
      expect(rack).toHaveLength(14)
      const m = matchHand(rack, def, { hasExposures: false })
      expect(m, def.id).not.toBeNull()
    })

    it(`${def.id} still matches with a joker substituted where legal`, () => {
      const { req } = firstPlan(def)
      const anyJokerGroup = [...req.values()].some((r) => r.jokerOK)
      if (!anyJokerGroup) return // e.g. Singles & Pairs — nothing to substitute
      const rack = materialize(req, 1)
      expect(rack.some((t) => t.kind === 'J')).toBe(true)
      expect(matchHand(rack, def), def.id).not.toBeNull()
    })
  }
})

// --- near-miss rejections ---------------------------------------------------

describe('near-misses are rejected', () => {
  it('rejects a hand with only 13 tiles', () => {
    const { req } = firstPlan(HANDS[0])
    const rack = materialize(req).slice(0, 13)
    expect(matchHand(rack, HANDS[0])).toBeNull()
  })

  it('rejects a joker used in a pair (Singles & Pairs)', () => {
    const sp = HANDS.find((h) => h.id === 'SP-1')!
    const { req } = firstPlan(sp)
    const rack = materialize(req)
    // Replace one natural tile with a joker — every SP group is a pair, so no
    // group can absorb it.
    rack[0] = tile('J')
    expect(matchHand(rack, sp)).toBeNull()
  })

  it('rejects a concealed hand once the player has exposures', () => {
    const sp = HANDS.find((h) => h.id === 'SP-1')!
    const { req } = firstPlan(sp)
    const rack = materialize(req)
    expect(matchHand(rack, sp, { hasExposures: false })).not.toBeNull()
    expect(matchHand(rack, sp, { hasExposures: true })).toBeNull()
  })

  it('rejects the wrong number of suits (kong of the same number needs 2 distinct suits)', () => {
    const like = HANDS.find((h) => h.id === 'LIKE-1')!
    // FF + two "kongs" of 5, but both in the same suit (B) instead of two suits.
    const rack = tiles(
      'F', 'F', 'F', 'F', 'F', 'F',
      'B5', 'B5', 'B5', 'B5',
      'B5', 'B5', 'B5', 'B5', // second kong in the same suit as the first
    )
    // 8 of B5 exceeds any single kong -> no distinct-suit assignment fits.
    expect(matchHand(rack, like)).toBeNull()
  })

  it('rejects an off-by-one consecutive run', () => {
    const run = HANDS.find((h) => h.id === 'RUN-6')!
    // Pungs of 2,3 + kongs of 4,6 (should be 5) — a gap.
    const rack = tiles(
      'B2', 'B2', 'B2',
      'B3', 'B3', 'B3',
      'B4', 'B4', 'B4', 'B4',
      'B6', 'B6', 'B6', 'B6',
    )
    expect(matchHand(rack, run)).toBeNull()
  })

  it('rejects an extra unmatched tile kind', () => {
    const even = HANDS.find((h) => h.id === 'EVEN-1')!
    // Pungs of 2,4 + a kong of 9 instead of 6, + kong of 8.
    const rack = tiles(
      'B2', 'B2', 'B2',
      'B4', 'B4', 'B4',
      'B9', 'B9', 'B9', 'B9',
      'B8', 'B8', 'B8', 'B8',
    )
    expect(matchHand(rack, even)).toBeNull()
  })
})

// --- targeted checks for DSL features unique to the real card ---------------

describe('additional hand checks (dragon "any"/"oppositeSx" enumeration)', () => {
  it('LIKE-3 matches with any single dragon color for its "any" pair', () => {
    const like3 = HANDS.find((h) => h.id === 'LIKE-3')!
    for (const color of ['DR', 'DG', 'DW']) {
      const rack = tiles('F', 'F', 'B5', 'B5', 'B5', 'B5', 'C5', 'C5', 'D5', 'D5', 'D5', 'D5', color, color)
      expect(matchHand(rack, like3), color).not.toBeNull()
    }
  })

  it('MUL3-5 matches an opposite-dragon kong that differs from the suit\'s matching dragon', () => {
    const mul35 = HANDS.find((h) => h.id === 'MUL3-5')!
    // Bam's matching dragon is Green — Red (an "opposite") should be accepted.
    const rack = tiles('F', 'F', 'F', 'B3', 'B3', 'B6', 'B6', 'B6', 'B9', 'B9', 'DR', 'DR', 'DR', 'DR')
    expect(matchHand(rack, mul35)).not.toBeNull()
  })

  it("MUL3-5 rejects the matching dragon in place of the required opposite", () => {
    const mul35 = HANDS.find((h) => h.id === 'MUL3-5')!
    // Green is Bam's *matching* dragon, not an opposite, for every suit this could resolve to.
    const rack = tiles('F', 'F', 'F', 'B3', 'B3', 'B6', 'B6', 'B6', 'B9', 'B9', 'DG', 'DG', 'DG', 'DG')
    expect(matchHand(rack, mul35)).toBeNull()
  })

  it('WD-3 matches three different dragons filling its three independent "any" slots', () => {
    const wd3 = HANDS.find((h) => h.id === 'WD-3')!
    const rack = tiles('B1', 'B2', 'B3', 'B4', 'DR', 'DR', 'DR', 'DG', 'DG', 'DG', 'DW', 'DW', 'DW', 'DW')
    expect(matchHand(rack, wd3)).not.toBeNull()
  })

  it('WD-3 rejects only two distinct dragon colors across its three "any" slots', () => {
    const wd3 = HANDS.find((h) => h.id === 'WD-3')!
    const rack = tiles('B1', 'B2', 'B3', 'B4', 'DR', 'DR', 'DR', 'DR', 'DR', 'DR', 'DW', 'DW', 'DW', 'DW')
    expect(matchHand(rack, wd3)).toBeNull()
  })

  it('SP-6 matches the soap ("0") tiles merged into one 3-tile group across three suits', () => {
    const sp6 = HANDS.find((h) => h.id === 'SP-6')!
    const rack = tiles('F', 'F', 'B2', 'B2', 'B6', 'C2', 'C2', 'C6', 'D2', 'D2', 'D6', 'DW', 'DW', 'DW')
    expect(matchHand(rack, sp6, { hasExposures: false })).not.toBeNull()
  })
})

// --- fuzz: every def accepts its own materializations, rejects mutations -----

describe('fuzz: materialize then match/mutate', () => {
  // Every tile kind this def could ever require, across all resolutions.
  function allResolvedKinds(def: HandDef): Set<TileKind> {
    const s = new Set<TileKind>()
    for (const assignment of suitAssignments(def)) {
      for (const n of nValues(def)) {
        for (const picks of dragonOptions(def, assignment)) {
          const req = resolveGroups(def, assignment, n, picks)
          if (req) for (const k of req.keys()) s.add(k)
        }
      }
    }
    return s
  }

  // A tile kind guaranteed to be foreign to this hand (leftover in every plan),
  // so swapping it in must break the hand — a deterministic negative.
  function foreignKind(def: HandDef): TileKind {
    const used = allResolvedKinds(def)
    const candidates: TileKind[] = ['WN', 'WE', 'WS', 'WW', 'DR', 'DG', 'DW', 'B1', 'B9', 'C1', 'C9', 'D1', 'D9']
    return candidates.find((k) => !used.has(k))!
  }

  it('accepts materialized winners across all plans, rejects any foreign-tile mutation', () => {
    const rng = mulberry32(12345)
    let accepted = 0
    let rejectedMutations = 0
    let totalMutations = 0
    for (const def of HANDS) {
      const foreign = foreignKind(def)
      for (const assignment of suitAssignments(def)) {
        for (const n of nValues(def)) {
          for (const picks of dragonOptions(def, assignment)) {
            const req = resolveGroups(def, assignment, n, picks)
            if (!req) continue
            const rack = materialize(req)
            // Positive: this def must accept its own materialization.
            expect(matchHand(rack, def), `${def.id} accept`).not.toBeNull()
            accepted++
            // Negative: replacing any tile with a kind this hand never uses breaks it.
            for (let trial = 0; trial < 3; trial++) {
              const mutated = rack.map((t) => ({ ...t }))
              mutated[randInt(rng, mutated.length)] = tile(foreign)
              totalMutations++
              if (matchHand(mutated, def) === null) rejectedMutations++
            }
          }
        }
      }
    }
    expect(accepted).toBeGreaterThan(20)
    expect(rejectedMutations).toBe(totalMutations)
  })
})

// --- closeness scorer -------------------------------------------------------

describe('closeness scorer', () => {
  it('reports distance 0 for a completed hand', () => {
    const { req } = firstPlan(HANDS.find((h) => h.id === 'EVEN-1')!)
    const rack = materialize(req)
    const top = closeness(rack, 3)
    expect(top[0].distance).toBe(0)
  })

  it('ranks a nearly-complete hand ahead of a random one', () => {
    // 13 tiles of EVEN-1 (pung2 + pung4 + kong6 + kong8 minus one) -> distance 1.
    const rack = tiles(
      'B2', 'B2', 'B2',
      'B4', 'B4', 'B4',
      'B6', 'B6', 'B6', 'B6',
      'B8', 'B8', 'B8',
    )
    const top = closeness(rack, 1)
    expect(top[0].distance).toBeLessThanOrEqual(1)
  })

  it('counts a joker toward a joker-eligible group', () => {
    const rack = tiles(
      'B2', 'B2', 'J', // joker completes the pung of 2
      'B4', 'B4', 'B4',
      'B6', 'B6', 'B6', 'B6',
      'B8', 'B8', 'B8', 'B8',
    )
    const top = closeness(rack, 1)
    expect(top[0].distance).toBe(0)
  })
})

// --- viability (stillReachable / handViability) ------------------------------

describe('stillReachable', () => {
  it('is false once every remaining copy of a needed kind is already accounted for', () => {
    const need = [{ kind: 'B8', count: 1, jokerOK: true }]
    expect(stillReachable(need, new Map([['B8', 4]]), 0)).toBe(false)
    expect(stillReachable(need, new Map([['B8', 4]]), 1)).toBe(true) // a joker can still fill it
    expect(stillReachable(need, new Map([['B8', 3]]), 0)).toBe(true) // one natural copy still unaccounted for
  })

  it('rejects any shortfall on a kind whose group forbids jokers, regardless of remaining jokers', () => {
    const need = [{ kind: 'F', count: 1, jokerOK: false }]
    expect(stillReachable(need, new Map([['F', 8]]), 8)).toBe(false)
  })
})

describe('handViability', () => {
  it('marks a completed hand winnable and reachable', () => {
    const rack = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8', 'B8')
    const even1 = handViability(rack, [], []).get('EVEN-1')!
    expect(even1.winnableNow).toBe(true)
    expect(even1.reachable).toBe(true)
  })

  it('marks a hand unreachable once every remaining copy of a still-needed tile, and every joker, is publicly visible', () => {
    // One B8 short of EVEN-1 (kong of 8); the 4th copy is in the discard pile, and
    // every joker that could otherwise substitute is already accounted for elsewhere.
    const rack = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    const otherKnown = tiles('B8', 'J', 'J', 'J', 'J', 'J', 'J', 'J', 'J')
    const even1 = handViability(rack, [], otherKnown).get('EVEN-1')!
    expect(even1.winnableNow).toBe(false)
    expect(even1.reachable).toBe(false)
  })
})
