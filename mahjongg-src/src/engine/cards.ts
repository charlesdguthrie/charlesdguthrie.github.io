// The hand-definition DSL — the load-bearing abstraction of the whole game.
//
// A card "hand" is expressed as DATA: an ordered list of groups whose numbers and
// suits may be parameterized, so the matcher can ENUMERATE possibilities rather than
// branch on hardcoded per-hand logic.
//
// This card is transcribed verbatim from a real 2026-themed novelty hand-tracker card
// (cross-referenced from two source images; see ~/work/obsidian-vault/10-Projects/
// mahjongg-simulator/hands.json for the source database, including flagged ambiguities
// and a few small color corrections applied below that the source data itself notes as
// likely transcription errors). It is NOT an official National Mah Jongg League card.

import type { DragonColor, Suit, Wind } from './tiles'

export type GroupSize = 1 | 2 | 3 | 4 | 5 | 6 // single, pair, pung, kong, quint, or (flowers only) a run of 6

/** A number: a literal 1-9, the free variable `n`, or `n` plus an offset ("n+1"). */
export type NumSpec = number | 'n' | `n+${number}`

export type SuitRole = 'S1' | 'S2' | 'S3'

export interface SuitGroup {
  kind: 'suit'
  suit: SuitRole
  num: NumSpec
  size: GroupSize
  jokerOK: boolean
}
export interface WindGroup {
  kind: 'wind'
  which: Wind
  size: GroupSize
  jokerOK: boolean
}
export interface DragonGroup {
  kind: 'dragon'
  /**
   * A specific dragon color; the dragon matching a suit role's suit; the dragon(s)
   * that do NOT match a suit role's suit (2 candidates, matcher's choice); or any
   * dragon at all (3 candidates, matcher's choice). The last two are resolved by
   * enumeration in match.ts (see `dragonSlots`/`dragonOptions`), not statically.
   */
  which: DragonColor | 'matchS1' | 'matchS2' | 'matchS3' | 'oppositeS1' | 'oppositeS2' | 'oppositeS3' | 'any'
  size: GroupSize
  jokerOK: boolean
}
export interface FlowerGroup {
  kind: 'flower'
  size: GroupSize
  jokerOK: false // jokers can NEVER stand in for flowers
}
export type Group = SuitGroup | WindGroup | DragonGroup | FlowerGroup

export interface HandDef {
  id: string
  section: string
  points: number
  concealed: boolean // if true, the hand may not use called exposures
  desc: string
  suits: { roles: SuitRole[]; distinct: boolean }
  /** Documentation flag; the matcher already ties `num:'n'` groups to one value. */
  sameNumberAcrossSuits?: boolean
  groups: Group[]
}

// ---------------------------------------------------------------------------
// The card: 72 hands across 9 sections, transcribed from the source card. A few
// notes on encoding choices made while translating the card's color-coded rows
// into this DSL:
//
// - Same color within one hand = same suit; different colors = different suits;
//   black is either "the one suit" (when the hand needs only one), a genuine third
//   suit (when the requirement text calls for "Any 3 Suits"), or a free/independent
//   suit choice — see each hand for which applies.
// - The novelty '0' tile (this card's 2026-theme digit) is encoded as a White
//   Dragon/Soap group (`DragonGroup{which:'W'}`), per the convention the card
//   itself implies (0 has no suit, just like a dragon).
// - A few rules the source card expresses that this DSL has no direct way to
//   represent are approximated with a literal number instead of a free choice
//   (documented inline on each affected hand): a free choice from a *specific
//   set* of numbers (e.g. "Pair Any Odd No.", "2, 4, 6, or 8"), or "Any Wind".
//   Free choice across a *contiguous* range ("Any N Consecutive/Like Numbers")
//   is fully supported via `NumSpec` ('n'/'n+k') and needs no approximation.
// - Every hand totals exactly 14 tiles. `validate()` enforces the invariants.
// ---------------------------------------------------------------------------

export const HANDS: HandDef[] = [
  // --- Any Like Numbers -----------------------------------------------------
  {
    id: 'LIKE-1',
    section: 'Any Like Numbers',
    points: 30,
    concealed: false,
    desc: 'Kong of the same number in two suits + flowers between',
    suits: { roles: ['S1', 'S2'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'flower', size: 6, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'LIKE-2',
    section: 'Any Like Numbers',
    points: 25,
    concealed: false,
    desc: 'Same number in three suits (kong-pung-kong) each with a lone matching dragon',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS1', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n', size: 3, jokerOK: true },
      { kind: 'dragon', which: 'matchS2', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 'n', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS3', size: 1, jokerOK: false },
    ],
  },
  {
    id: 'LIKE-3',
    section: 'Any Like Numbers',
    points: 25,
    concealed: false,
    desc: 'Flowers + same number in three suits (kong-pair-kong) + a dragon pair of any color',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 'n', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 2, jokerOK: false },
    ],
  },

  // --- Quints ----------------------------------------------------------------
  {
    id: 'QUINT-1',
    section: 'Quints',
    points: 40,
    concealed: false,
    desc: 'Quints of the same number in two suits + a kong in the third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 5, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 'n', size: 5, jokerOK: true },
    ],
  },
  {
    id: 'QUINT-2',
    section: 'Quints',
    points: 45,
    concealed: false,
    desc: 'Flowers + a quint, pair, and quint of three consecutive numbers, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 5, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 5, jokerOK: true },
    ],
  },
  {
    id: 'QUINT-3',
    section: 'Quints',
    points: 40,
    concealed: false,
    desc: 'Quints of 1 and 4, one suit, + a kong of the opposite dragon (card allows any two numbers; fixed here)',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 5, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 4, size: 5, jokerOK: true },
      { kind: 'dragon', which: 'oppositeS1', size: 4, jokerOK: true },
    ],
  },

  // --- Consecutive Run ---------------------------------------------------------
  {
    id: 'RUN-1',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Pair-pung-pair-pung-kong of 1,2,3,4,5 — one suit, these numbers only',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 5, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-2',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Pair-pung-pair-pung-kong of 5,6,7,8,9 — one suit, these numbers only',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-3',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers + kongs of the outer two of five consecutive numbers, singles between, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+3', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+4', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-4',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers + kongs of the outer two of five consecutive numbers in one suit, singles of the middle three in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+1', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n+2', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n+3', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+4', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-5',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Pairs of two consecutive numbers in one suit, pungs of the same two in another, kong of the third number in a third suit',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+1', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 'n+2', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-6',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Pungs of the first two, kongs of the last two of four consecutive numbers, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+3', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-7',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Pungs of the first two of four consecutive numbers in one suit, kongs of the last two in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+2', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+3', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-8',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers, pair-pair-pung of three consecutive numbers, kong of the matching dragon, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 3, jokerOK: true },
      { kind: 'dragon', which: 'matchS1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-9',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers, pair-pair-pung of three consecutive numbers split across two suits, kong of the dragon matching the middle number’s suit',
    suits: { roles: ['S1', 'S2'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 3, jokerOK: true },
      { kind: 'dragon', which: 'matchS2', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-10',
    section: 'Consecutive Run',
    points: 30,
    concealed: false,
    desc: 'Kong-flowers-kong of two consecutive numbers, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'flower', size: 6, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-11',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers + kongs of three consecutive numbers, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-12',
    section: 'Consecutive Run',
    points: 25,
    concealed: false,
    desc: 'Flowers + kongs of three consecutive numbers, one per suit, three suits',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+1', size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 'n+2', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'RUN-13',
    section: 'Consecutive Run',
    points: 35,
    concealed: true,
    // Source card colored the second single-pair-pung block the same as the first
    // (which would need 6 copies of one tile, impossible); corrected so the two
    // blocks are distinct suits, per its "Any 3 Suits" requirement.
    desc: 'Single-pair-pung of three consecutive numbers in two suits + a pair of the fourth in a third suit (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    sameNumberAcrossSuits: true,
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 'n', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 'n+2', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 'n+3', size: 2, jokerOK: false },
    ],
  },

  // --- 13579 -------------------------------------------------------------------
  {
    id: 'ODD-1',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Pair-pung-pair-pung-kong of 1,3,5,7,9, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-2',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Pair of 1, pung of 3, pair of 5, in three suits total, + pung of 7 and kong of 9 in the third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 7, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-3',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Pungs of 1 and 3 in one suit, kongs of 3 and 5 in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 3, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 5, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-4',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Pungs of 5 and 7 in one suit, kongs of 7 and 9 in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 5, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 7, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 7, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-5',
    section: '13579',
    points: 30,
    concealed: false,
    desc: 'North and South wind pairs bookending a kong-pair-kong of 1,3,5 — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'wind', which: 'N', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 1, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 4, jokerOK: true },
      { kind: 'wind', which: 'S', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'ODD-6',
    section: '13579',
    points: 30,
    concealed: false,
    desc: 'North and South wind pairs bookending a kong-pair-kong of 5,7,9 — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'wind', which: 'N', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 4, jokerOK: true },
      { kind: 'wind', which: 'S', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'ODD-7',
    section: '13579',
    points: 25,
    concealed: false,
    // Card lets the pair be any odd number, with both kongs matching it; that free
    // "pick one of 5 values, then match it elsewhere" choice isn't representable
    // in this DSL, so the pair/kongs are fixed at 1 (the singles fill out the rest).
    desc: 'Pair of 1 + singles of 3,5,7,9 in one suit, kongs of 1 in two other suits (card allows any odd number to be paired/matched; fixed here at 1)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 1, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 1, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-8',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Flowers, pairs of 1 and 3, pung of 5, kong of the matching dragon — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 3, jokerOK: true },
      { kind: 'dragon', which: 'matchS1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-9',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Flowers, pairs of 5 and 7, pung of 9, kong of the matching dragon — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 3, jokerOK: true },
      { kind: 'dragon', which: 'matchS1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-10',
    section: '13579',
    points: 25,
    concealed: false,
    desc: 'Pairs of 1 and 3 in one suit, pungs of 1 and 3 in another, kong of 5 in a third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 1, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 5, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-11',
    section: '13579',
    points: 25,
    // Source card colored the pung of 5 the same as the pairs (green); corrected to
    // match the pung of 7 (red) instead, since the requirement is "Any 3 Suits" and
    // the original coloring only used two.
    concealed: false,
    desc: 'Pairs of 5 and 7 in one suit, pungs of 5 and 7 in another, kong of 9 in a third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 5, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 7, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-12',
    section: '13579',
    points: 30,
    concealed: false,
    desc: 'Kong-pair-pair-pair-kong of 1,3,5,7,9, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-13',
    section: '13579',
    points: 30,
    concealed: false,
    desc: 'Kong-pair-pair-pair of 1,3,5,7 in one suit, kong of 9 in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'ODD-14',
    section: '13579',
    points: 35,
    concealed: true,
    desc: 'Flowers, pairs of 1, 3, 5 in one suit, pungs of 1 in two other suits (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 1, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 1, size: 3, jokerOK: true },
    ],
  },
  {
    id: 'ODD-15',
    section: '13579',
    points: 35,
    concealed: true,
    desc: 'Flowers, pairs of 5, 7, 9 in one suit, pungs of 5 in two other suits (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 5, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 5, size: 3, jokerOK: true },
    ],
  },
  {
    id: 'ODD-16',
    section: '13579',
    points: 30,
    concealed: true,
    desc: 'Flowers, singles of 1,3,5, pungs of 7 and 9, kong of the opposite dragon — one suit (concealed)',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 1, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 9, size: 3, jokerOK: true },
      { kind: 'dragon', which: 'oppositeS1', size: 3, jokerOK: true },
    ],
  },

  // --- Winds & Dragons -----------------------------------------------------
  {
    id: 'WD-1',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Kong-pung-pung-kong of North, East, West, South',
    suits: { roles: [], distinct: false },
    groups: [
      { kind: 'wind', which: 'N', size: 4, jokerOK: true },
      { kind: 'wind', which: 'E', size: 3, jokerOK: true },
      { kind: 'wind', which: 'W', size: 3, jokerOK: true },
      { kind: 'wind', which: 'S', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'WD-2',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Pung-kong-kong-pung of North, East, West, South',
    suits: { roles: [], distinct: false },
    groups: [
      { kind: 'wind', which: 'N', size: 3, jokerOK: true },
      { kind: 'wind', which: 'E', size: 4, jokerOK: true },
      { kind: 'wind', which: 'W', size: 4, jokerOK: true },
      { kind: 'wind', which: 'S', size: 3, jokerOK: true },
    ],
  },
  {
    id: 'WD-3',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Four consecutive numbers (singles), one suit, + a pung, pung, and kong of three different dragons',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+3', size: 1, jokerOK: false },
      { kind: 'dragon', which: 'any', size: 3, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 3, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'WD-4',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    // Card allows any odd number (matched across both suits); fixed at 1 since this
    // DSL's free variable ranges over all of 1-9, not just odd values.
    desc: 'North and South wind pungs bookending kongs of 1 in two suits (card allows any odd number; fixed here at 1)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'wind', which: 'N', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 1, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 1, size: 4, jokerOK: true },
      { kind: 'wind', which: 'S', size: 3, jokerOK: true },
    ],
  },
  {
    id: 'WD-5',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    // Card allows any even number (matched across both suits); fixed at 2, same
    // limitation as WD-4 above.
    desc: 'East and West wind pungs bookending kongs of 2 in two suits (card allows any even number; fixed here at 2)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'wind', which: 'E', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 2, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 2, size: 4, jokerOK: true },
      { kind: 'wind', which: 'W', size: 3, jokerOK: true },
    ],
  },
  {
    id: 'WD-6',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    // Card allows any wind; fixed at North since this DSL's wind groups take a
    // literal wind (only dragons got a free-choice extension for this card).
    desc: 'Flowers, a kong of North wind, flowers, a kong of any dragon (card allows any wind; fixed here at North)',
    suits: { roles: [], distinct: false },
    groups: [
      { kind: 'flower', size: 6, jokerOK: false },
      { kind: 'wind', which: 'N', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'WD-7',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Singles/pungs of 1,2,3,4 paired with North, East(pair), West(pung), South(kong) — one suit, these numbers only',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 1, jokerOK: false },
      { kind: 'wind', which: 'N', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 1, jokerOK: false },
      { kind: 'wind', which: 'E', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 1, jokerOK: false },
      { kind: 'wind', which: 'W', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 4, size: 1, jokerOK: false },
      { kind: 'wind', which: 'S', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'WD-8',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Flowers, kongs of North and South wind, + pairs of any two different dragons',
    suits: { roles: [], distinct: false },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'wind', which: 'N', size: 4, jokerOK: true },
      { kind: 'wind', which: 'S', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 2, jokerOK: false },
      { kind: 'dragon', which: 'any', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'WD-9',
    section: 'Winds & Dragons',
    points: 25,
    concealed: false,
    desc: 'Flowers, kongs of East and West wind, + pairs of any two different dragons',
    suits: { roles: [], distinct: false },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'wind', which: 'E', size: 4, jokerOK: true },
      { kind: 'wind', which: 'W', size: 4, jokerOK: true },
      { kind: 'dragon', which: 'any', size: 2, jokerOK: false },
      { kind: 'dragon', which: 'any', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'WD-10',
    section: 'Winds & Dragons',
    points: 30,
    concealed: true,
    desc: 'Winds N,E,W,S around a pair of 2, a soap (0) single, and a single 6 — one suit, "2026" (concealed)',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'wind', which: 'N', size: 2, jokerOK: false },
      { kind: 'wind', which: 'E', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'W', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'wind', which: 'W', size: 3, jokerOK: true },
      { kind: 'wind', which: 'S', size: 2, jokerOK: false },
    ],
  },

  // --- 369 -----------------------------------------------------------------
  {
    id: 'MUL3-1',
    section: '369',
    points: 25,
    concealed: false,
    desc: 'Pungs of 3 and 6 in one suit, kongs of 6 and 9 in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-2',
    section: '369',
    points: 25,
    concealed: false,
    desc: 'Pungs of 3 and 6 in one suit, kong of 6 in a second, kong of 9 in a third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-3',
    section: '369',
    points: 25,
    concealed: false,
    desc: 'Pairs of 3 and 6 in one suit, pungs of 3 and 6 in another, kong of 9 in a third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 9, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-4',
    section: '369',
    points: 25,
    concealed: false,
    desc: 'Flowers, pair of 3, pung of 6, pair of 9, kong of the matching dragon — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 9, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'matchS1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-5',
    section: '369',
    points: 25,
    concealed: false,
    desc: 'Flowers, pair of 3, pung of 6, pair of 9, kong of the opposite dragon — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 9, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'oppositeS1', size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-6',
    section: '369',
    points: 30,
    concealed: false,
    desc: 'Pairs of 3 and 6 in one suit, pungs of 6 and 9 in another, + one of each wind',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 9, size: 3, jokerOK: true },
      { kind: 'wind', which: 'N', size: 1, jokerOK: false },
      { kind: 'wind', which: 'E', size: 1, jokerOK: false },
      { kind: 'wind', which: 'W', size: 1, jokerOK: false },
      { kind: 'wind', which: 'S', size: 1, jokerOK: false },
    ],
  },
  {
    id: 'MUL3-7',
    section: '369',
    points: 25,
    concealed: false,
    // Card lets the pair be 3, 6, or 9, with both kongs matching it; fixed at 3
    // (same free-choice-then-match limitation as ODD-7).
    desc: 'Flowers, pair of 3 + singles of 6,9 in one suit, kongs of 3 in two other suits (card allows the pair to be 3, 6, or 9; fixed here at 3)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 3, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 3, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'MUL3-8',
    section: '369',
    points: 30,
    concealed: true,
    desc: 'Flowers, pungs of 3 and 6 in one suit, kong of 9 + singles of 3,6 in another (concealed)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 9, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 1, jokerOK: false },
    ],
  },

  // --- Singles & Pairs -------------------------------------------------------
  {
    id: 'SP-1',
    section: 'Singles & Pairs',
    points: 50,
    concealed: true,
    // Card's "1D" notation is ambiguous in the source (see hands.json flagged
    // issues); read here as a plain pair of 1, per the tile count it needs to work.
    desc: 'Wind pairs N,E,W,S + a pair of 1 in each of three suits (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'wind', which: 'N', size: 2, jokerOK: false },
      { kind: 'wind', which: 'E', size: 2, jokerOK: false },
      { kind: 'wind', which: 'W', size: 2, jokerOK: false },
      { kind: 'wind', which: 'S', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 1, size: 2, jokerOK: false },
    ],
  },
  {
    id: 'SP-2',
    section: 'Singles & Pairs',
    points: 50,
    concealed: true,
    desc: 'Singles of 2,4 + pairs of 6,8 in two suits, + a lone extra pair of 8 in a third (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 8, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 8, size: 2, jokerOK: false },
    ],
  },
  {
    id: 'SP-3',
    section: 'Singles & Pairs',
    points: 50,
    concealed: true,
    desc: 'Flowers + a pair of 3 and singles of 6,9 in each of three suits, rotated (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 9, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 9, size: 2, jokerOK: false },
    ],
  },
  {
    id: 'SP-4',
    section: 'Singles & Pairs',
    points: 50,
    concealed: true,
    desc: 'Pairs of seven consecutive numbers, one suit (concealed)',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 'n', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+1', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+2', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+3', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+4', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+5', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 'n+6', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'SP-5',
    section: 'Singles & Pairs',
    points: 50,
    concealed: true,
    // Source card colored one 9-pair green and the other red, splitting what should
    // be two clean same-suit blocks (1 + singles 3,5,7 + 9) into three suits; the
    // requirement is "Any 2 Suits", so both blocks' pairs of 9 are corrected to
    // match their own block's color.
    desc: 'Pair of 1, singles of 3,5,7, pair of 9 — in each of two suits (concealed)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 5, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 7, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 9, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 1, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 3, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 5, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 7, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 9, size: 2, jokerOK: false },
    ],
  },
  {
    id: 'SP-6',
    section: 'Singles & Pairs',
    points: 75,
    concealed: true,
    // The card's "0" digit appears once per suit (three times total) but dragons
    // have no suit, so all three collapse into a single 3-tile soap group.
    desc: 'Flowers, a pair of 2 + single of 6 in each of three suits, + three soap (0) tiles — "2026" (concealed)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 2, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 2, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 6, size: 1, jokerOK: false },
      { kind: 'dragon', which: 'W', size: 3, jokerOK: true },
    ],
  },

  // --- 2026 ------------------------------------------------------------------
  {
    id: 'YEAR-1',
    section: '2026',
    points: 25,
    concealed: false,
    desc: 'Pung of 2 + three soap (0) tiles in one suit’s block, kongs of 2 and 6 in another suit',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 3, jokerOK: true },
      { kind: 'dragon', which: 'W', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 2, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'YEAR-2',
    section: '2026',
    points: 25,
    concealed: false,
    // Card allows the second suit's kong to be 2 or 6; fixed at 2 (matches "2026").
    desc: 'Pair of 2, a soap (0) single, single of 6, pung of the matching dragon — one suit, + kong of 2 and its matching dragon in another (card allows 2 or 6 for the kong; fixed here at 2)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'W', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'dragon', which: 'matchS1', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 2, size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS2', size: 3, jokerOK: true },
    ],
  },
  {
    id: 'YEAR-3',
    section: '2026',
    points: 25,
    concealed: false,
    desc: 'Flowers, pair of 2 + soap (0) single + single of 6 in one suit, pung of 2 in a second, kong of 6 in a third',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'W', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 2, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S3', num: 6, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'YEAR-4',
    section: '2026',
    points: 25,
    concealed: false,
    desc: 'Pair of 2 + a pair of soap (0) in one suit, pungs of 2 and 6 in another, + one of each wind',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'dragon', which: 'W', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 2, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 3, jokerOK: true },
      { kind: 'wind', which: 'N', size: 1, jokerOK: false },
      { kind: 'wind', which: 'E', size: 1, jokerOK: false },
      { kind: 'wind', which: 'W', size: 1, jokerOK: false },
      { kind: 'wind', which: 'S', size: 1, jokerOK: false },
    ],
  },

  // --- 2468 ------------------------------------------------------------------
  {
    id: 'EVEN-1',
    section: '2468',
    points: 25,
    concealed: false,
    desc: 'Pungs of 2 and 4, kongs of 6 and 8, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 4, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 6, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 8, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-2',
    section: '2468',
    points: 25,
    concealed: false,
    desc: 'Pungs of 2 and 4 in one suit, kongs of 6 and 8 in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 4, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 6, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 8, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-3',
    section: '2468',
    points: 30,
    concealed: false,
    // Source card colored the pair of 6 black; corrected to match the pair of 4
    // (its own block's color), per the "Any 2 Suits" requirement.
    desc: 'Flowers, kong of 2 + pairs of 4 and 6 + kong of 8, split across two suits',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 4, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 4, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-4',
    section: '2468',
    points: 30,
    concealed: false,
    desc: 'East and West wind pairs bookending pair-pung-pung-pair of 2,4,6,8 — one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'wind', which: 'E', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 8, size: 2, jokerOK: false },
      { kind: 'wind', which: 'W', size: 2, jokerOK: false },
    ],
  },
  {
    id: 'EVEN-5',
    section: '2468',
    points: 25,
    concealed: false,
    desc: 'Kong of 2 + matching dragon pung in one suit, kong of 8 + matching dragon pung in another',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS1', size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 8, size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS2', size: 3, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-6',
    section: '2468',
    points: 25,
    concealed: false,
    desc: 'Flowers, pairs of 2 and 4, pung of 6, kong of 8, one suit',
    suits: { roles: ['S1'], distinct: false },
    groups: [
      { kind: 'flower', size: 3, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S1', num: 8, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-7',
    section: '2468',
    points: 25,
    concealed: false,
    // Card lets the two matching-dragon kongs be any of 2, 4, 6, or 8 (matched to
    // each other); fixed at 2, same free-choice-then-match limitation as ODD-7.
    desc: 'Singles of 2,4,6,8 in one suit, kongs of 2 + matching lone dragons in two other suits (card allows 2, 4, 6, or 8; fixed here at 2)',
    suits: { roles: ['S1', 'S2', 'S3'], distinct: true },
    groups: [
      { kind: 'suit', suit: 'S1', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 2, size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS2', size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S3', num: 2, size: 4, jokerOK: true },
      { kind: 'dragon', which: 'matchS3', size: 1, jokerOK: false },
    ],
  },
  {
    id: 'EVEN-8',
    section: '2468',
    points: 30,
    concealed: false,
    // Card lets the kong be any of 2, 4, 6, or 8; fixed at 2, same limitation as
    // EVEN-7 above. The two flower groups (3+3) merge into one, since flowers have
    // no suit and the matcher can't treat two flower requirements independently.
    desc: 'Flowers, singles of 2,4,6,8 in one suit, kong of 2 in another (card allows 2, 4, 6, or 8; fixed here at 2)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'flower', size: 6, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 2, size: 4, jokerOK: true },
    ],
  },
  {
    id: 'EVEN-9',
    section: '2468',
    points: 30,
    concealed: true,
    desc: 'Flowers, singles of 2,4,6 + pung of 8, in each of two suits (concealed)',
    suits: { roles: ['S1', 'S2'], distinct: true },
    groups: [
      { kind: 'flower', size: 2, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S1', num: 8, size: 3, jokerOK: true },
      { kind: 'suit', suit: 'S2', num: 2, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 4, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 6, size: 1, jokerOK: false },
      { kind: 'suit', suit: 'S2', num: 8, size: 3, jokerOK: true },
    ],
  },
]

// --- number-spec helpers ----------------------------------------------------

/** Does this hand use the free number variable `n`? */
export function usesN(def: HandDef): boolean {
  return def.groups.some((g) => g.kind === 'suit' && g.num !== +(g.num as number))
}

/** Largest offset used with `n` (0 for plain `n`), or -1 if `n` is unused. */
export function maxOffset(def: HandDef): number {
  let max = -1
  for (const g of def.groups) {
    if (g.kind !== 'suit') continue
    if (g.num === 'n') max = Math.max(max, 0)
    else if (typeof g.num === 'string' && g.num.startsWith('n+')) {
      max = Math.max(max, Number(g.num.slice(2)))
    }
  }
  return max
}

/** Resolve a NumSpec against a concrete `n`; returns null if out of 1..9. */
export function resolveNum(spec: NumSpec, n: number): number | null {
  let v: number
  if (typeof spec === 'number') v = spec
  else if (spec === 'n') v = n
  else v = n + Number(spec.slice(2))
  return v >= 1 && v <= 9 ? v : null
}

// --- validation -------------------------------------------------------------

export interface ValidationIssue {
  handId: string
  problem: string
}

/**
 * Assert the structural invariants every hand must satisfy. Called at module load
 * (and in tests) so that editing the card can't silently produce a broken hand.
 */
export function validate(hands: HandDef[] = HANDS): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Set<string>()

  for (const def of hands) {
    if (seen.has(def.id)) issues.push({ handId: def.id, problem: 'duplicate id' })
    seen.add(def.id)

    const total = def.groups.reduce((s, g) => s + g.size, 0)
    if (total !== 14) {
      issues.push({ handId: def.id, problem: `groups sum to ${total}, not 14` })
    }

    for (const g of def.groups) {
      if (g.size < 3 && g.jokerOK) {
        issues.push({ handId: def.id, problem: `jokerOK on a size-${g.size} group` })
      }
      if (g.kind === 'flower' && g.jokerOK) {
        issues.push({ handId: def.id, problem: 'jokerOK on a flower group' })
      }
      if (g.kind === 'suit' && !def.suits.roles.includes(g.suit)) {
        issues.push({ handId: def.id, problem: `group uses ${g.suit} not declared in suits.roles` })
      }
      if (g.kind === 'dragon' && (g.which.startsWith('match') || g.which.startsWith('opposite'))) {
        const role = (g.which.startsWith('match') ? g.which.slice(5) : g.which.slice(8)) as SuitRole
        if (!def.suits.roles.includes(role)) {
          issues.push({ handId: def.id, problem: `dragon references ${role} not in suits.roles` })
        }
      }
    }

    // Every resolvable value of `n` must keep offsets within 1..9 for at least one n.
    if (usesN(def)) {
      const hi = 9 - Math.max(0, maxOffset(def))
      if (hi < 1) issues.push({ handId: def.id, problem: 'no valid n keeps numbers in 1..9' })
    }
  }

  return issues
}

// Fail loudly at load time if the card is malformed.
const _issues = validate(HANDS)
if (_issues.length > 0) {
  // eslint-disable-next-line no-console
  console.error('Invalid hand definitions:', _issues)
  throw new Error(`cards.ts: ${_issues.length} invalid hand definition(s)`)
}

export type { Suit }
