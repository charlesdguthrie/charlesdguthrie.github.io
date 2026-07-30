// Win overlay for GAME_OVER_WIN: confetti burst + a staggered reveal of the
// winner's full hand (concealed tiles + exposures). Deliberately only ever
// receives the winning player's data — other players' hands stay private,
// exactly as they would at a real table.
import { motion } from 'framer-motion'
import { Tile } from './Tile'
import { Confetti } from './Confetti'
import type { Player } from '../engine/state'
import type { MatchResult } from '../engine/match'
import { sortTiles } from '../engine/tiles'

interface WinScreenProps {
  winner: Player
  result: MatchResult | null
  onPlayAgain: () => void
}

export function WinScreen({ winner, result, onPlayAgain }: WinScreenProps) {
  const sortedHand = sortTiles(winner.hand)
  const exposedCount = winner.exposures.reduce((n, m) => n + m.tiles.length, 0)

  return (
    <div className="overlay">
      <div className="overlay-card win-screen">
        <Confetti />
        <h1>{winner.name} won! 🎉</h1>
        {result && (
          <p className="overlay-hand">
            {result.def.section} — {result.def.desc}
            <br />
            <strong>{result.def.points} points</strong>
          </p>
        )}

        <div className="win-reveal-label">Winning hand</div>
        {winner.exposures.length > 0 && (
          <div className="exposures win-reveal-exposures">
            {winner.exposures.map((m, mi) => {
              const priorTiles = winner.exposures.slice(0, mi).reduce((n, x) => n + x.tiles.length, 0)
              return (
                <div key={mi} className="meld">
                  {m.tiles.map((t, ti) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 14, rotate: -8 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      transition={{ delay: 0.04 * (priorTiles + ti), type: 'spring', stiffness: 320, damping: 24 }}
                    >
                      <Tile kind={t.kind} small />
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
        <div className="rack win-reveal-rack">
          {sortedHand.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 22, rotate: -10 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.04 * (exposedCount + i) + 0.15, type: 'spring', stiffness: 320, damping: 24 }}
            >
              <Tile kind={t.kind} />
            </motion.div>
          ))}
        </div>

        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  )
}
