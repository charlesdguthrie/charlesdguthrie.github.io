import { AnimatePresence } from 'framer-motion'
import { Tile } from './Tile'
import type { Tile as TileModel } from '../engine/tiles'

export interface DiscardPileProps {
  discards: { tile: TileModel; seat: number }[] // full history, in play order
  playerNames: string[] // index by seat
}

/**
 * Full discard history, most-recent last. Renders as a small-tile grid that
 * wraps and scrolls (rather than growing the page indefinitely) so it stays
 * usable across a whole game (0 to 70+ discards). The most recent discard is
 * visually distinguished (highlight ring) and captioned "from {name}",
 * matching the single-tile treatment this replaces.
 */
export function DiscardPile({ discards, playerNames }: DiscardPileProps) {
  const lastIndex = discards.length - 1

  return (
    <div className="discard-pile">
      {discards.length === 0 ? (
        <div className="discard-empty">No discards yet</div>
      ) : (
        <div className="discard-pile-scroll">
          <AnimatePresence initial={false}>
            {discards.map((d, i) => {
              const isLatest = i === lastIndex
              const name = playerNames[d.seat] ?? `Seat ${d.seat}`
              return (
                <div
                  key={d.tile.id}
                  className={`discard-pile-item${isLatest ? ' discard-pile-item-latest' : ''}`}
                >
                  <Tile small kind={d.tile.kind} id={d.tile.id} title={`${d.tile.kind} — from ${name}`} />
                </div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      {lastIndex >= 0 && (
        <div className="last-discard-by">from {playerNames[discards[lastIndex].seat] ?? `Seat ${discards[lastIndex].seat}`}</div>
      )}
    </div>
  )
}
