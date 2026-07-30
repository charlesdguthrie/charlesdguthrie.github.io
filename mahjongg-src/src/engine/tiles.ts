// The tile model. Everything else in the engine keys off a tile's `kind` string,
// so this is the single most important encoding decision in the codebase.
//
// American Mah Jongg uses a 152-tile set:
//   - 3 suits (Bam/Crak/Dot) x 9 numbers x 4 copies      = 108
//   - 4 winds (N/E/S/W) x 4 copies                       =  16
//   - 3 dragons (Red/Green/White "soap") x 4 copies      =  12
//   - 8 Flowers                                          =   8
//   - 8 Jokers                                           =   8
//                                                    total = 152

import type { RNG } from './rng'
import { shuffle } from './rng'

export type Suit = 'B' | 'C' | 'D' // Bam (bamboo), Crak (character), Dot (circle)
export type Wind = 'N' | 'E' | 'S' | 'W'
export type DragonColor = 'R' | 'G' | 'W' // Red, Green, White (soap)

/**
 * Canonical tile kind. Two physical tiles are interchangeable for matching iff
 * they share a `kind`. Numbered suits are `${Suit}${1..9}` (e.g. "B5"); winds
 * `W${Wind}` (WN/WE/WS/WW); dragons `D${DragonColor}` (DR/DG/DW); "F" flower;
 * "J" joker.
 */
export type TileKind = string

/** A single physical tile with a stable per-copy id (for tracking/animation). */
export interface Tile {
  id: number
  kind: TileKind
}

export type MeldType = 'pung' | 'kong' | 'quint' | 'pair'

/**
 * A called, face-up group. `kind` is the natural tile kind the meld represents
 * (the called/matched tile); the meld may also contain jokers.
 */
export interface Meld {
  type: MeldType
  kind: TileKind
  tiles: Tile[]
  calledFrom?: number // seat the called tile came from
}

// Standard NMJL dragon <-> suit association. Several hands ("dragon matching the
// suit", NEWS + matching dragon) depend on this, so it lives in one table.
//   Bam  <-> Green
//   Crak <-> Red
//   Dot  <-> White (soap)
export const DRAGON_FOR_SUIT: Record<Suit, DragonColor> = { B: 'G', C: 'R', D: 'W' }
export const SUIT_FOR_DRAGON: Record<DragonColor, Suit> = { G: 'B', R: 'C', W: 'D' }

export const SUITS: Suit[] = ['B', 'C', 'D']
export const WINDS: Wind[] = ['N', 'E', 'S', 'W']
export const DRAGONS: DragonColor[] = ['R', 'G', 'W']

// --- kind predicates & accessors -------------------------------------------

export function isJoker(kind: TileKind): boolean {
  return kind === 'J'
}
export function isFlower(kind: TileKind): boolean {
  return kind === 'F'
}
export function isWind(kind: TileKind): boolean {
  return kind[0] === 'W' && kind.length === 2 && 'NESW'.includes(kind[1])
}
export function isDragon(kind: TileKind): boolean {
  return kind[0] === 'D' && kind.length === 2 && 'RGW'.includes(kind[1])
}
export function isSuited(kind: TileKind): boolean {
  return (kind[0] === 'B' || kind[0] === 'C' || kind[0] === 'D') && kind.length === 2 && kind[1] >= '1' && kind[1] <= '9'
}
export function isHonor(kind: TileKind): boolean {
  return isWind(kind) || isDragon(kind)
}

/** Suit of a numbered tile, or null for honors/flowers/jokers. */
export function suitOf(kind: TileKind): Suit | null {
  return isSuited(kind) ? (kind[0] as Suit) : null
}
/** Number (1-9) of a numbered tile, or null otherwise. */
export function numOf(kind: TileKind): number | null {
  return isSuited(kind) ? Number(kind[1]) : null
}
/** Wind letter (N/E/S/W) or null. */
export function windOf(kind: TileKind): Wind | null {
  return isWind(kind) ? (kind[1] as Wind) : null
}
/** Dragon color (R/G/W) or null. */
export function dragonOf(kind: TileKind): DragonColor | null {
  return isDragon(kind) ? (kind[1] as DragonColor) : null
}

export function suitedKind(suit: Suit, num: number): TileKind {
  return `${suit}${num}`
}
export function windKind(w: Wind): TileKind {
  return `W${w}`
}
export function dragonKind(c: DragonColor): TileKind {
  return `D${c}`
}

// --- wall construction ------------------------------------------------------

/** Build the full, ordered 152-tile set (before shuffling). */
export function buildWall(): Tile[] {
  const tiles: Tile[] = []
  let id = 0
  const push = (kind: TileKind, copies: number) => {
    for (let c = 0; c < copies; c++) tiles.push({ id: id++, kind })
  }

  for (const s of SUITS) for (let n = 1; n <= 9; n++) push(suitedKind(s, n), 4)
  for (const w of WINDS) push(windKind(w), 4)
  for (const d of DRAGONS) push(dragonKind(d), 4)
  push('F', 8)
  push('J', 8)

  if (tiles.length !== 152) {
    throw new Error(`buildWall: expected 152 tiles, built ${tiles.length}`)
  }
  return tiles
}

/** Build and shuffle a wall using the given RNG. */
export function buildShuffledWall(rng: RNG): Tile[] {
  return shuffle(buildWall(), rng)
}

// --- dealing ----------------------------------------------------------------

export const NUM_PLAYERS = 4
/** Seat index 0 is East (the dealer / human). Deal: East 14, everyone else 13. */
export const DEALER_SEAT = 0

export interface Deal {
  hands: Tile[][] // hands[seat] = that player's concealed tiles
  wall: Tile[] // remaining draw wall
}

/**
 * Deal from a shuffled wall: dealer (seat 0) gets 14 tiles, the other three get
 * 13 each. Remaining tiles form the draw wall (152 - 53 = 99).
 */
export function deal(wall: Tile[]): Deal {
  const hands: Tile[][] = [[], [], [], []]
  const w = wall.slice()
  for (let seat = 0; seat < NUM_PLAYERS; seat++) {
    const count = seat === DEALER_SEAT ? 14 : 13
    for (let i = 0; i < count; i++) hands[seat].push(w.shift()!)
  }
  return { hands, wall: w }
}

// --- rack helpers -----------------------------------------------------------

/** Reduce a set of tiles to a multiset of kinds -> count (matching operates on this). */
export function toCounts(tiles: Tile[]): Map<TileKind, number> {
  const m = new Map<TileKind, number>()
  for (const t of tiles) m.set(t.kind, (m.get(t.kind) ?? 0) + 1)
  return m
}

/** Physical copies of a tile kind in the 152-tile set (8 for flowers/jokers, else 4). */
export function maxCopies(kind: TileKind): number {
  return kind === 'F' || kind === 'J' ? 8 : 4
}

/** Sort key that groups a rack sensibly: suits by number, then winds, dragons, flowers, jokers. */
export function sortKey(kind: TileKind): number {
  if (isSuited(kind)) {
    const s = SUITS.indexOf(kind[0] as Suit)
    return s * 10 + numOf(kind)!
  }
  if (isWind(kind)) return 100 + WINDS.indexOf(kind[1] as Wind)
  if (isDragon(kind)) return 200 + DRAGONS.indexOf(kind[1] as DragonColor)
  if (isFlower(kind)) return 300
  return 400 // joker
}

/** Return a new array sorted for display. */
export function sortTiles(tiles: Tile[]): Tile[] {
  return tiles.slice().sort((a, b) => sortKey(a.kind) - sortKey(b.kind) || a.id - b.id)
}

/** Sort key that groups by number first, suit second (honors/flowers/jokers last, as in `sortKey`). */
export function rankSortKey(kind: TileKind): number {
  if (isSuited(kind)) return numOf(kind)! * 10 + SUITS.indexOf(kind[0] as Suit)
  if (isWind(kind)) return 100 + WINDS.indexOf(kind[1] as Wind)
  if (isDragon(kind)) return 200 + DRAGONS.indexOf(kind[1] as DragonColor)
  if (isFlower(kind)) return 300
  return 400 // joker
}

/** Return a new array sorted by rank (number) rather than suit. */
export function sortTilesByRank(tiles: Tile[]): Tile[] {
  return tiles.slice().sort((a, b) => rankSortKey(a.kind) - rankSortKey(b.kind) || a.id - b.id)
}

const SUIT_NAME: Record<Suit, string> = { B: 'Bam', C: 'Crak', D: 'Dot' }
const WIND_NAME: Record<Wind, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }
const DRAGON_NAME: Record<DragonColor, string> = { R: 'Red', G: 'Green', W: 'Soap' }

/** Plain-text label for a tile kind (used in the log and call prompts). */
export function describeKind(kind: TileKind): string {
  if (isJoker(kind)) return 'Joker'
  if (isFlower(kind)) return 'Flower'
  if (isWind(kind)) return `${WIND_NAME[windOf(kind)!]} Wind`
  if (isDragon(kind)) return `${DRAGON_NAME[dragonOf(kind)!]} Dragon`
  return `${numOf(kind)} ${SUIT_NAME[suitOf(kind)!]}`
}
