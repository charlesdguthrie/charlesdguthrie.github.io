// Pure formatting/keying helpers for the closeness helper UI. Kept separate from
// the component so they're easy to unit test without a DOM.

import type { Meld, Tile } from '../engine/tiles'

/** Human-readable distance label, e.g. "Ready to win!" / "1 tile away" / "3 tiles away". */
export function formatDistance(distance: number): string {
  if (distance <= 0) return 'Ready to win!'
  return `${distance} tile${distance === 1 ? '' : 's'} away`
}

/**
 * Stable string key for a player's concealed hand + exposures, suitable as a
 * `useMemo` dependency so closeness isn't recomputed just because a new array
 * reference was created — only when the actual tiles/melds change.
 */
export function handKey(concealed: Tile[], exposures: Meld[]): string {
  const handPart = concealed
    .map((t) => t.kind)
    .sort()
    .join(',')
  const exposurePart = exposures
    .map((m) => `${m.type}:${m.kind}:${m.tiles.map((t) => t.kind).sort().join('')}`)
    .sort()
    .join('|')
  return `${handPart}#${exposurePart}`
}
