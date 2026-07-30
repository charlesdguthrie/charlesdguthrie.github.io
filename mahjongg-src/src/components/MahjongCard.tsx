// The always-visible reference card: every hand on the card, laid out in the
// same section order as the source 2026 Mahjong Hand Tracker card, with each
// hand's pattern text/requirement/ink-color rendered verbatim from
// `cardDisplay.ts` (transcribed from the source card), and shaded by how
// viable each hand currently is. The player's 10 closest still-reachable
// hands (ties included) are called out — this is the only "closeness" UI in
// the app now; it supersedes the separate `ClosenessHelper` panel.
//
// Pure presentational component: it derives everything from props via
// `handViability` (src/engine/match.ts) and never touches game state itself.

import { useMemo } from 'react'
import { resolveNum, type HandDef, type SuitRole } from '../engine/cards'
import { handViability, type Closeness, type HandViability } from '../engine/match'
import { DRAGON_FOR_SUIT, type Meld, type Tile, type TileKind } from '../engine/tiles'
import { HAND_DISPLAY } from '../engine/cardDisplay'
import { groupBySection } from './cardPanelHelpers'
import { formatDistance, handKey } from './closenessFormat'

export interface MahjongCardProps {
  /** All hand definitions to render — pass `HANDS`. */
  hands: HandDef[]
  /** The human player's concealed tiles. */
  concealed: Tile[]
  /** The human player's own called exposures. */
  exposures: Meld[]
  /**
   * Every OTHER known tile: all discards + every OTHER player's exposures
   * (not the human's own — those go in `exposures`). Used only to decide
   * reachability (whether a still-needed tile could plausibly still surface).
   */
  otherKnownTiles: Tile[]
  /**
   * Fired on hovering a hand row with the ids of the human's own concealed
   * tiles that count toward that hand under its best current resolution, and
   * with `null` on hover-out (`onMouseLeave`). Optional — omit if the
   * integrating UI doesn't need a "highlight my matching tiles" feature.
   */
  onHighlightChange?: (tileIds: Set<number> | null) => void
}

// --- hover-highlight matching -------------------------------------------------
// This is unrelated to display (see cardDisplay.ts for the literal card
// text) — it's purely for "which of my tiles count toward this hand".

interface ResolvedItem {
  kind: TileKind | null // null = wildcard "any dragon color"
  count: number
  jokerOK: boolean
}

/**
 * Resolve a hand's groups to concrete required kinds under a `Closeness`'s
 * assignment/n, for tile-matching (not display). Free-pick dragon groups
 * ('any'/'opposite<Suit>') resolve to `kind: null`, a wildcard matched
 * against any dragon-colored tile the player holds — the matcher's actual
 * pick isn't recoverable from `Closeness`, so this is a deliberate, harmless
 * simplification for a hover highlight.
 */
function resolveHandRequirement(def: HandDef, closeness: Closeness): ResolvedItem[] {
  const { assignment, n } = closeness
  const items: ResolvedItem[] = []
  for (const g of def.groups) {
    if (g.kind === 'suit') {
      const suit = assignment[g.suit]
      if (!suit) continue
      const num = n !== null ? resolveNum(g.num, n) : typeof g.num === 'number' ? g.num : null
      if (num === null) continue
      items.push({ kind: `${suit}${num}`, count: g.size, jokerOK: g.jokerOK })
    } else if (g.kind === 'wind') {
      items.push({ kind: `W${g.which}`, count: g.size, jokerOK: g.jokerOK })
    } else if (g.kind === 'flower') {
      items.push({ kind: 'F', count: g.size, jokerOK: false })
    } else if (g.which === 'R' || g.which === 'G' || g.which === 'W') {
      items.push({ kind: `D${g.which}`, count: g.size, jokerOK: g.jokerOK })
    } else if (g.which.startsWith('match')) {
      const role = g.which.slice(5) as SuitRole
      const suit = assignment[role]
      if (suit) items.push({ kind: `D${DRAGON_FOR_SUIT[suit]}`, count: g.size, jokerOK: g.jokerOK })
    } else {
      items.push({ kind: null, count: g.size, jokerOK: g.jokerOK })
    }
  }
  return items
}

/**
 * Which of the player's own concealed tile ids are already "spoken for"
 * toward this hand's best current resolution. Greedy: for each resolved
 * requirement, claim natural tiles of the matching kind first (wildcard
 * dragon requirements claim any dragon color), then spend jokers on whatever
 * shortfall remains if the group allows it. This intentionally doesn't try to
 * find the single "optimal" assignment of ambiguous jokers across groups —
 * for a hover highlight, "a" reasonable set of matching tiles is sufficient,
 * not necessarily the exact set `closenessForHandEx` counted internally.
 */
export function tilesUsedForHand(def: HandDef, closeness: Closeness, concealed: Tile[]): Set<number> {
  const byKind = new Map<TileKind, number[]>()
  const jokerIds: number[] = []
  for (const t of concealed) {
    if (t.kind === 'J') jokerIds.push(t.id)
    else byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t.id])
  }
  let jokerCursor = 0
  const used = new Set<number>()
  const takeJokers = (count: number) => {
    let remaining = count
    while (remaining > 0 && jokerCursor < jokerIds.length) {
      used.add(jokerIds[jokerCursor++])
      remaining--
    }
    return remaining
  }

  for (const item of resolveHandRequirement(def, closeness)) {
    let remaining = item.count
    if (item.kind === null) {
      for (const color of ['R', 'G', 'W'] as const) {
        if (remaining === 0) break
        const ids = byKind.get(`D${color}`)
        if (!ids) continue
        while (remaining > 0 && ids.length > 0) {
          used.add(ids.shift()!)
          remaining--
        }
      }
    } else {
      const ids = byKind.get(item.kind)
      if (ids) {
        while (remaining > 0 && ids.length > 0) {
          used.add(ids.shift()!)
          remaining--
        }
      }
    }
    if (remaining > 0 && item.jokerOK) remaining = takeJokers(remaining)
  }
  return used
}

// --- layout ------------------------------------------------------------------
// The source card prints its 9 sections in 3 columns, top-to-bottom then
// left-to-right; `groupBySection` preserves HANDS's own array order instead,
// so re-sort to the card's actual reading order.
const SECTION_ORDER = [
  '2026',
  '2468',
  'Any Like Numbers',
  'Quints',
  'Consecutive Run',
  '13579',
  'Winds & Dragons',
  '369',
  'Singles & Pairs',
]

// --- viability state -----------------------------------------------------------

type HandState = 'winnable' | 'top3' | 'close' | 'viable' | 'dead'

/** How many closest reachable hands to call out (ties at the cutoff distance are all kept). */
const CLOSE_COUNT = 10
/** Of those, how many get the extra "top 3" emphasis (ties at the cutoff are all kept too). */
const TOP_COUNT = 3

function otherTilesKey(tiles: Tile[]): string {
  return tiles
    .map((t) => t.kind)
    .sort()
    .join(',')
}

/** Ids within the N closest (by distance) of a distance-sorted `[id, viability]` list, ties included. */
function closestIds(sorted: [string, HandViability][], count: number): Set<string> {
  if (sorted.length <= count) return new Set(sorted.map(([id]) => id))
  const cutoff = sorted[count - 1][1].closeness.distance
  return new Set(sorted.filter(([, v]) => v.closeness.distance <= cutoff).map(([id]) => id))
}

export function MahjongCard({ hands, concealed, exposures, otherKnownTiles, onHighlightChange }: MahjongCardProps) {
  // Depend on a stable content-derived key, not the array references
  // themselves, so re-renders that pass new-but-equal arrays don't force a
  // recompute of viability for all 72 hands.
  const key = `${handKey(concealed, exposures)}#${otherTilesKey(otherKnownTiles)}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viability = useMemo(() => handViability(concealed, exposures, otherKnownTiles, hands), [key, hands])
  const sections = useMemo(() => {
    const grouped = groupBySection(hands)
    return [...grouped].sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section))
  }, [hands])

  const { closeIds, top3Ids } = useMemo(() => {
    const reachable = [...viability.entries()].filter(([, v]) => v.reachable)
    reachable.sort((a, b) => a[1].closeness.distance - b[1].closeness.distance)
    return { closeIds: closestIds(reachable, CLOSE_COUNT), top3Ids: closestIds(reachable, TOP_COUNT) }
  }, [viability])

  const handleEnter = (def: HandDef) => {
    if (!onHighlightChange) return
    const v = viability.get(def.id)
    if (!v) return
    onHighlightChange(tilesUsedForHand(def, v.closeness, concealed))
  }
  const handleLeave = () => onHighlightChange?.(null)

  return (
    <div className="mahjong-card">
      <div className="mahjong-card-title">The Card</div>
      <div className="mahjong-card-sections">
        {sections.map((s) => (
          <div key={s.section} className="mahjong-card-section">
            <div className="mahjong-card-section-title">{s.section}</div>
            <ul className="mahjong-card-hand-list">
              {s.hands.map((def) => {
                const v = viability.get(def.id)
                const state: HandState = !v
                  ? 'dead'
                  : v.winnableNow
                    ? 'winnable'
                    : v.reachable
                      ? top3Ids.has(def.id)
                        ? 'top3'
                        : closeIds.has(def.id)
                          ? 'close'
                          : 'viable'
                      : 'dead'
                const display = HAND_DISPLAY[def.id]
                return (
                  <li
                    key={def.id}
                    className={`mahjong-card-hand mahjong-card-hand-${state}`}
                    onMouseEnter={() => handleEnter(def)}
                    onMouseLeave={handleLeave}
                  >
                    <div className="mahjong-card-hand-line">
                      <span className="mahjong-card-pattern">
                        {display.groups.map((g, i) => (
                          <span key={i} className={`mahjong-card-ink-${g.color}`}>
                            {g.text}
                          </span>
                        ))}
                      </span>
                      <span className="mahjong-card-fill" aria-hidden="true" />
                      <span className="mahjong-card-prefix">{def.concealed ? 'C' : 'X'}</span>
                      <span className="mahjong-card-points">{def.points}</span>
                    </div>
                    <div className="mahjong-card-meta">
                      {display.requirement && (
                        <span className="mahjong-card-requirement">({display.requirement})</span>
                      )}
                      {state === 'winnable' && <span className="mahjong-card-winnable-badge">Ready!</span>}
                      {(state === 'top3' || state === 'close') && v && (
                        <span className="mahjong-card-distance">{formatDistance(v.closeness.distance)}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
