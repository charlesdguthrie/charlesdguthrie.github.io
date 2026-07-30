// The matching engine: given a set of tiles, decide whether it satisfies any card
// hand, and (for the UX helper) how close it is to each hand.
//
// Strategy: for each hand definition, enumerate the small space of (suit-role
// assignment) x (number variable n) x (dragon-slot picks, for hands with 'any' or
// 'oppositeSx' dragon groups). Each combination resolves every group to a concrete
// required tile-kind + count; matching then reduces to a linear multiset cover — no
// backtracking. The enumeration is tiny (<= ~250 combos/hand), so the whole card
// matches in well under a millisecond.

import {
  DRAGON_FOR_SUIT,
  DRAGONS,
  maxCopies,
  SUITS,
  type DragonColor,
  type Meld,
  type Suit,
  type Tile,
  type TileKind,
} from './tiles'
import {
  HANDS,
  maxOffset,
  resolveNum,
  usesN,
  type DragonGroup,
  type Group,
  type GroupSize,
  type HandDef,
  type SuitRole,
} from './cards'

export type Assignment = Partial<Record<SuitRole, Suit>>

export interface MatchResult {
  def: HandDef
  assignment: Assignment
  n: number | null
}

/** A rack reduced for matching: natural tile counts (no jokers) + a joker count. */
export interface RackCounts {
  counts: Map<TileKind, number>
  jokers: number
  total: number
}

export function rackCounts(tiles: Tile[]): RackCounts {
  const counts = new Map<TileKind, number>()
  let jokers = 0
  for (const t of tiles) {
    if (t.kind === 'J') jokers++
    else counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1)
  }
  let natural = 0
  for (const c of counts.values()) natural += c
  return { counts, jokers, total: natural + jokers }
}

// --- enumeration ------------------------------------------------------------
// suitAssignments/nValues/dragonSlots/dragonOptions are all pure functions of a
// `def` (and, for dragonOptions, an assignment) — never the rack — but sit in the
// hot path of every AI decision. They're memoized so the small enumeration space
// per hand is computed once rather than rebuilt on every call.

/** All role->suit assignments, honoring the `distinct` (different suits) flag. */
const suitAssignmentsCache = new WeakMap<HandDef, Assignment[]>()
export function suitAssignments(def: HandDef): Assignment[] {
  const cached = suitAssignmentsCache.get(def)
  if (cached) return cached
  const roles = def.suits.roles
  const out: Assignment[] = roles.length === 0 ? [{}] : []
  if (roles.length > 0) {
    const walk = (i: number, acc: Assignment, used: Set<Suit>) => {
      if (i === roles.length) {
        out.push({ ...acc })
        return
      }
      for (const s of SUITS) {
        if (def.suits.distinct && used.has(s)) continue
        acc[roles[i]] = s
        used.add(s)
        walk(i + 1, acc, used)
        used.delete(s)
      }
    }
    walk(0, {}, new Set())
  }
  suitAssignmentsCache.set(def, out)
  return out
}

/** The dragon groups whose color isn't fixed by the definition alone ('any' or
 * 'oppositeSx') — the matcher must enumerate a concrete color for each. */
const dragonSlotsCache = new WeakMap<HandDef, DragonGroup[]>()
export function dragonSlots(def: HandDef): DragonGroup[] {
  const cached = dragonSlotsCache.get(def)
  if (cached) return cached
  const slots = def.groups.filter(
    (g): g is DragonGroup => g.kind === 'dragon' && (g.which === 'any' || g.which.startsWith('opposite')),
  )
  dragonSlotsCache.set(def, slots)
  return slots
}

/**
 * Cartesian product of candidate colors for each dragon slot, given a resolved
 * suit assignment (needed for 'oppositeSx' slots). One array per combination,
 * aligned index-for-index with `dragonSlots(def)`. `[[]]` (one empty combo) when
 * there are no free slots, `[]` if an 'oppositeSx' slot's suit role isn't assigned.
 */
const dragonOptionsCache = new WeakMap<HandDef, Map<string, DragonColor[][]>>()
export function dragonOptions(def: HandDef, assignment: Assignment): DragonColor[][] {
  const slots = dragonSlots(def)
  if (slots.length === 0) return [[]]

  let cache = dragonOptionsCache.get(def)
  if (!cache) {
    cache = new Map()
    dragonOptionsCache.set(def, cache)
  }
  const key = `${assignment.S1 ?? ''}${assignment.S2 ?? ''}${assignment.S3 ?? ''}`
  const hit = cache.get(key)
  if (hit) return hit

  const perSlot: DragonColor[][] = []
  for (const g of slots) {
    if (g.which === 'any') {
      perSlot.push([...DRAGONS])
    } else {
      const role = g.which.slice(8) as SuitRole // 'oppositeS1' -> 'S1'
      const suit = assignment[role]
      if (!suit) {
        cache.set(key, [])
        return []
      }
      const excluded = DRAGON_FOR_SUIT[suit]
      perSlot.push(DRAGONS.filter((d) => d !== excluded))
    }
  }
  let combos: DragonColor[][] = [[]]
  for (const candidates of perSlot) {
    const next: DragonColor[][] = []
    for (const partial of combos) for (const c of candidates) next.push([...partial, c])
    combos = next
  }
  // Two dragon groups always collide when they resolve to the same color (dragon
  // tile kinds ignore which slot asked for them), so any combo with a repeated
  // color is guaranteed invalid — pruning them here avoids wastefully re-deriving
  // that same rejection deeper in resolveGroups on every one of the (many) callers.
  if (slots.length > 1) {
    combos = combos.filter((picks) => new Set(picks).size === picks.length)
  }
  cache.set(key, combos)
  return combos
}

export interface Required {
  count: number
  jokerOK: boolean
}
function groupKind(g: Group, assignment: Assignment, n: number, dragonPick?: DragonColor): TileKind | null {
  switch (g.kind) {
    case 'suit': {
      const suit = assignment[g.suit]
      if (!suit) return null
      const num = resolveNum(g.num, n)
      if (num === null) return null
      return `${suit}${num}`
    }
    case 'wind':
      return `W${g.which}`
    case 'dragon': {
      if (g.which === 'any' || g.which.startsWith('opposite')) {
        return dragonPick ? `D${dragonPick}` : null
      }
      if (g.which.startsWith('match')) {
        const role = g.which.slice(5) as SuitRole
        const suit = assignment[role]
        if (!suit) return null
        return `D${DRAGON_FOR_SUIT[suit]}`
      }
      return `D${g.which}`
    }
    case 'flower':
      return 'F'
  }
}

/**
 * Resolve every group to required (kind -> count/jokerOK). Returns null if two
 * groups collide on the same kind (that assignment is not a valid arrangement), any
 * number falls outside 1..9, or an 'any'/'oppositeSx' dragon slot has no pick.
 *
 * This is a pure function of its arguments (never the rack), but it's called from
 * `matchHand`/`closenessForHand`(`Ex`) on every AI decision — thousands of times per
 * game against the same small set of (def, assignment, n, picks) combinations — so
 * results are memoized per `def` rather than recomputed from scratch each time.
 */
const resolveCache = new WeakMap<HandDef, Map<string, Map<TileKind, Required> | null>>()
export function resolveGroups(
  def: HandDef,
  assignment: Assignment,
  n: number,
  dragonPicks: DragonColor[] = [],
): Map<TileKind, Required> | null {
  let cache = resolveCache.get(def)
  if (!cache) {
    cache = new Map()
    resolveCache.set(def, cache)
  }
  const key = `${assignment.S1 ?? ''}${assignment.S2 ?? ''}${assignment.S3 ?? ''}|${n}|${dragonPicks.join('')}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const slots = dragonSlots(def)
  const pickFor = new Map<Group, DragonColor>(slots.map((g, i) => [g, dragonPicks[i]]))

  const req = new Map<TileKind, Required>()
  let result: Map<TileKind, Required> | null = req
  for (const g of def.groups) {
    const kind = groupKind(g, assignment, n, pickFor.get(g))
    if (kind === null) {
      result = null
      break
    }
    if (req.has(kind)) {
      result = null // two groups want the same tile -> invalid arrangement
      break
    }
    req.set(kind, { count: g.size, jokerOK: g.jokerOK })
  }
  cache.set(key, result)
  return result
}

/** The (small) list of `n` values to try, or [0] when the hand doesn't use `n`. */
const nValuesCache = new WeakMap<HandDef, number[]>()
export function nValues(def: HandDef): number[] {
  const cached = nValuesCache.get(def)
  if (cached) return cached
  let out: number[]
  if (!usesN(def)) {
    out = [0]
  } else {
    const hi = 9 - Math.max(0, maxOffset(def))
    out = []
    for (let n = 1; n <= hi; n++) out.push(n)
  }
  nValuesCache.set(def, out)
  return out
}

// --- exact win test ---------------------------------------------------------

/** True iff the rack exactly fills the resolved requirement (all 14 tiles used). */
function coversExactly(rack: RackCounts, req: Map<TileKind, Required>): boolean {
  // No natural tile may be left unplaced, and none may exceed what a group needs.
  for (const [k, a] of rack.counts) {
    const r = req.get(k)
    if (!r || a > r.count) return false
  }
  let jokerNeed = 0
  for (const [k, r] of req) {
    const shortfall = r.count - (rack.counts.get(k) ?? 0)
    if (shortfall > 0) {
      if (!r.jokerOK) return false
      jokerNeed += shortfall
    }
  }
  return jokerNeed === rack.jokers
}

export interface MatchOptions {
  /** Player has called exposures — concealed-only hands are then ineligible. */
  hasExposures?: boolean
}

/** Does this exact set of tiles win on the given hand? */
export function matchHand(tiles: Tile[], def: HandDef, opts: MatchOptions = {}): MatchResult | null {
  if (def.concealed && opts.hasExposures) return null
  const rack = rackCounts(tiles)
  if (rack.total !== 14) return null
  for (const assignment of suitAssignments(def)) {
    for (const n of nValues(def)) {
      for (const picks of dragonOptions(def, assignment)) {
        const req = resolveGroups(def, assignment, n, picks)
        if (!req) continue
        if (coversExactly(rack, req)) {
          return { def, assignment, n: usesN(def) ? n : null }
        }
      }
    }
  }
  return null
}

/** First winning hand for these tiles, or null. */
export function findWin(
  tiles: Tile[],
  opts: MatchOptions = {},
  hands: HandDef[] = HANDS,
): MatchResult | null {
  for (const def of hands) {
    const m = matchHand(tiles, def, opts)
    if (m) return m
  }
  return null
}

/**
 * True if some hand definition has a group resolving to exactly this kind + size,
 * for at least one suit-assignment/n/dragon-pick, honoring whether jokers were used
 * to fill it. Used to decide whether calling a discard to form this meld is ever legal.
 */
export function groupExists(
  kind: TileKind,
  size: GroupSize,
  jokersUsed: number,
  hands: HandDef[] = HANDS,
): boolean {
  for (const def of hands) {
    for (const assignment of suitAssignments(def)) {
      for (const n of nValues(def)) {
        for (const picks of dragonOptions(def, assignment)) {
          const req = resolveGroups(def, assignment, n, picks)
          if (!req) continue
          const r = req.get(kind)
          if (r && r.count === size && (jokersUsed === 0 || r.jokerOK)) return true
        }
      }
    }
  }
  return false
}

// --- closeness (UX helper) --------------------------------------------------

export interface NeedItem {
  kind: TileKind
  count: number
  jokerOK: boolean
}
export interface Closeness {
  def: HandDef
  assignment: Assignment
  n: number | null
  matched: number // tiles already in place (0..14)
  distance: number // 14 - matched
  need: NeedItem[] // kinds still required (best resolution)
}

function scoreResolution(rack: RackCounts, req: Map<TileKind, Required>): { matched: number; need: NeedItem[] } {
  let naturalMatched = 0
  let jokerCapacity = 0
  const need: NeedItem[] = []
  for (const [k, r] of req) {
    const a = rack.counts.get(k) ?? 0
    const placed = Math.min(a, r.count)
    naturalMatched += placed
    const short = r.count - placed
    if (short > 0) {
      if (r.jokerOK) jokerCapacity += short
      need.push({ kind: k, count: short, jokerOK: r.jokerOK })
    }
  }
  const jokersUsed = Math.min(rack.jokers, jokerCapacity)
  return { matched: naturalMatched + jokersUsed, need }
}

/** Best closeness score for a single hand across all resolutions. */
export function closenessForHand(tiles: Tile[], def: HandDef, opts: MatchOptions = {}): Closeness | null {
  if (def.concealed && opts.hasExposures) return null
  const rack = rackCounts(tiles)
  let best: Closeness | null = null
  for (const assignment of suitAssignments(def)) {
    for (const n of nValues(def)) {
      for (const picks of dragonOptions(def, assignment)) {
        const req = resolveGroups(def, assignment, n, picks)
        if (!req) continue
        const { matched, need } = scoreResolution(rack, req)
        if (!best || matched > best.matched) {
          best = { def, assignment, n: usesN(def) ? n : null, matched, distance: 14 - matched, need }
        }
      }
    }
  }
  return best
}

/** Rank the hands the tiles are closest to (smallest distance first). */
export function closeness(
  tiles: Tile[],
  topN = 3,
  opts: MatchOptions = {},
  hands: HandDef[] = HANDS,
): Closeness[] {
  const scored: Closeness[] = []
  for (const def of hands) {
    const c = closenessForHand(tiles, def, opts)
    if (c) scored.push(c)
  }
  scored.sort((a, b) => a.distance - b.distance || b.def.points - a.def.points)
  return scored.slice(0, topN)
}

// --- exposure-aware evaluation ----------------------------------------------
// During play a hand may include called melds. Those are locked: each must map to
// a whole group of the pursued hand. The functions below deduct the exposed melds
// from a resolution, then score the remaining concealed tiles against what's left.

/** Deduct exposed melds from a resolution's groups; null if any meld can't map. */
function deductExposures(req: Map<TileKind, Required>, exposures: Meld[]): Map<TileKind, Required> | null {
  const rem = new Map(req)
  for (const m of exposures) {
    const r = rem.get(m.kind)
    if (!r || r.count !== m.tiles.length) return null
    const jokers = m.tiles.filter((t) => t.kind === 'J').length
    if (jokers > 0 && !r.jokerOK) return null
    rem.delete(m.kind)
  }
  return rem
}

/** Closeness for one hand given locked exposures + remaining concealed tiles. */
export function closenessForHandEx(concealed: Tile[], exposures: Meld[], def: HandDef): Closeness | null {
  if (def.concealed && exposures.length > 0) return null
  const rack = rackCounts(concealed)
  const exposedCount = exposures.reduce((a, m) => a + m.tiles.length, 0)
  let best: Closeness | null = null
  for (const assignment of suitAssignments(def)) {
    for (const n of nValues(def)) {
      for (const picks of dragonOptions(def, assignment)) {
        const req = resolveGroups(def, assignment, n, picks)
        if (!req) continue
        const rem = deductExposures(req, exposures)
        if (!rem) continue
        const { matched, need } = scoreResolution(rack, rem)
        const total = exposedCount + matched
        if (!best || total > best.matched) {
          best = { def, assignment, n: usesN(def) ? n : null, matched: total, distance: 14 - total, need }
        }
      }
    }
  }
  return best
}

/** Rank hands by closeness given locked exposures + concealed tiles. */
export function closenessEx(
  concealed: Tile[],
  exposures: Meld[],
  topN = 3,
  hands: HandDef[] = HANDS,
): Closeness[] {
  const scored: Closeness[] = []
  for (const def of hands) {
    const c = closenessForHandEx(concealed, exposures, def)
    if (c) scored.push(c)
  }
  scored.sort((a, b) => a.distance - b.distance || b.def.points - a.def.points)
  return scored.slice(0, topN)
}

// --- viability (UX helper) ---------------------------------------------------
// A hand a player is "close to" may already be impossible: every copy of some
// tile it still needs might be visible in discards or opponents' exposures.
// Opponents' concealed tiles are unknown, so a tile only counts as "gone" once
// it's actually visible — this is the optimistic (and correct) reading of "not
// yet proven dead", not a guess at what opponents hold.

/** True if enough copies of every still-needed kind could plausibly remain. */
export function stillReachable(need: NeedItem[], used: Map<TileKind, number>, remainingJokers: number): boolean {
  let jokerNeed = 0
  for (const item of need) {
    const avail = maxCopies(item.kind) - (used.get(item.kind) ?? 0)
    const shortfall = item.count - avail
    if (shortfall > 0) {
      if (!item.jokerOK) return false
      jokerNeed += shortfall
    }
  }
  return jokerNeed <= remainingJokers
}

export interface HandViability {
  closeness: Closeness
  reachable: boolean // some copies of every still-needed tile remain unaccounted for
  winnableNow: boolean // this exact rack already completes the hand
}

/**
 * Viability of every hand for a player, given their own tiles and everything
 * publicly visible elsewhere (discards + every player's exposures — pass the
 * player's own exposures via `exposures`, not again in `otherKnownTiles`).
 */
export function handViability(
  concealed: Tile[],
  exposures: Meld[],
  otherKnownTiles: Tile[],
  hands: HandDef[] = HANDS,
): Map<string, HandViability> {
  const used = new Map<TileKind, number>()
  let usedJokers = 0
  const count = (t: Tile) => {
    if (t.kind === 'J') usedJokers++
    else used.set(t.kind, (used.get(t.kind) ?? 0) + 1)
  }
  concealed.forEach(count)
  exposures.forEach((m) => m.tiles.forEach(count))
  otherKnownTiles.forEach(count)
  const remainingJokers = maxCopies('J') - usedJokers

  const out = new Map<string, HandViability>()
  for (const def of hands) {
    const c = closenessForHandEx(concealed, exposures, def)
    if (!c) continue
    out.set(def.id, {
      closeness: c,
      reachable: c.distance === 0 || stillReachable(c.need, used, remainingJokers),
      winnableNow: c.distance === 0,
    })
  }
  return out
}
