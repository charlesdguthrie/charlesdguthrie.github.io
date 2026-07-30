import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, Reorder } from 'framer-motion'
import { Tile } from './Tile'
import { isJoker, sortTiles, sortTilesByRank, type Tile as TileModel } from '../engine/tiles'

export interface HandRackProps {
  tiles: TileModel[] // the player's current concealed hand, in GAME order (not pre-sorted)
  selectable: boolean // Charleston/courtesy pass mode: click toggles selection instead of discarding
  selected: Set<number> // selected tile ids (only meaningful when selectable)
  onToggleSelect?: (id: number, kind: string) => void
  onDiscard?: (id: number) => void // only called when !selectable and it's the player's discard turn
  canDiscard: boolean // true only during the player's PLAY_DISCARD turn
  /** Tile ids to visually call out (e.g. hovering a hand on the card). */
  highlightedIds?: Set<number>
}

/** Stable signature of a tile-id set, independent of array order/identity — used to
 * detect "the set of tiles in hand actually changed" (draw/discard/Charleston) vs.
 * "the same tiles re-rendered with a new array reference". */
function idsSignature(tiles: TileModel[]): string {
  return tiles
    .map((t) => t.id)
    .sort((a, b) => a - b)
    .join(',')
}

/**
 * The player's hand, rendered as a drag-to-reorder rack (Framer Motion `Reorder`)
 * with "Sort by Suit" / "Sort by Rank" shortcuts. Display order is local state so
 * a manual drag-reorder survives re-renders; it's only reconciled (not reset) when
 * the underlying set of tile ids actually changes.
 */
export function HandRack({ tiles, selectable, selected, onToggleSelect, onDiscard, canDiscard, highlightedIds }: HandRackProps) {
  const [order, setOrder] = useState<number[]>(() => sortTiles(tiles).map((t) => t.id))
  const signature = useMemo(() => idsSignature(tiles), [tiles])

  // Reconcile local display order whenever the SET of tile ids changes (draw,
  // discard, Charleston pass) — keep existing relative order for tiles still
  // present, drop ids that left, and append newly-arrived ids (sorted) at the end.
  // Deliberately keyed on `signature` (not `tiles`) so a same-tiles re-render with
  // a fresh array reference does NOT reset the user's manual arrangement.
  useEffect(() => {
    setOrder((prevOrder) => {
      const currentIds = new Set(tiles.map((t) => t.id))
      const kept = prevOrder.filter((id) => currentIds.has(id))
      const keptSet = new Set(kept)
      const arrived = sortTiles(tiles.filter((t) => !keptSet.has(t.id))).map((t) => t.id)
      return [...kept, ...arrived]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles])
  const orderedTiles = order.map((id) => tileById.get(id)).filter((t): t is TileModel => t !== undefined)

  return (
    <>
      <div className="rack-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOrder(sortTiles(tiles).map((t) => t.id))}
        >
          Sort by Suit
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOrder(sortTilesByRank(tiles).map((t) => t.id))}
        >
          Sort by Rank
        </button>
      </div>
      <Reorder.Group as="div" axis="x" values={order} onReorder={setOrder} className="rack">
        <AnimatePresence>
          {orderedTiles.map((t) => {
            const onClick = selectable
              ? onToggleSelect
                ? () => onToggleSelect(t.id, t.kind)
                : undefined
              : canDiscard
                ? onDiscard
                  ? () => onDiscard(t.id)
                  : undefined
                : undefined
            const title = selectable
              ? isJoker(t.kind)
                ? 'Jokers cannot be passed'
                : t.kind
              : canDiscard
                ? `Discard ${t.kind}`
                : t.kind
            return (
              <Reorder.Item as="div" key={t.id} value={t.id} className="rack-item">
                <Tile
                  id={t.id}
                  kind={t.kind}
                  selected={selectable && selected.has(t.id)}
                  dimmed={!selectable && !canDiscard}
                  highlighted={highlightedIds?.has(t.id)}
                  onClick={onClick}
                  title={title}
                />
              </Reorder.Item>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>
    </>
  )
}
