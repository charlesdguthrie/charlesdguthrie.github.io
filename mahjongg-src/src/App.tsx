import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGame } from './store'
import { Tile } from './components/Tile'
import { HandRack } from './components/HandRack'
import { DiscardPile } from './components/DiscardPile'
import { MahjongCard } from './components/MahjongCard'
import { WinScreen } from './components/WinScreen'
import { isJoker, type Meld } from './engine/tiles'
import { currentPlayer, winningResult, type Player } from './engine/state'
import { HANDS } from './engine/cards'
import './App.css'

const CHARLESTON_LABEL: Record<string, string> = {
  CHARLESTON_1_RIGHT: 'Charleston 1: pass right',
  CHARLESTON_1_ACROSS: 'Charleston 1: pass across',
  CHARLESTON_1_LEFT: 'Charleston 1: pass left',
  CHARLESTON_2_LEFT: 'Charleston 2: pass left',
  CHARLESTON_2_ACROSS: 'Charleston 2: pass across',
  CHARLESTON_2_RIGHT: 'Charleston 2: pass right',
}

export default function App() {
  const game = useGame((s) => s.game)
  const dispatch = useGame((s) => s.dispatch)
  const newGame = useGame((s) => s.newGame)
  const history = useGame((s) => s.history)
  const undo = useGame((s) => s.undo)

  const you = game.players[0]
  const opponents = game.players.slice(1)
  const gameOver = game.phase === 'GAME_OVER_WIN' || game.phase === 'GAME_OVER_WALL'
  const isCallWindow = game.phase === 'CALL_WINDOW'
  const isCharlestonPass = game.phase in CHARLESTON_LABEL
  const isCharlestonDecision = game.phase === 'CHARLESTON_2_DECISION'
  const isCourtesy = game.phase === 'COURTESY_DECISION'
  const yourTurnToDiscard = !gameOver && game.turn === 0 && game.phase === 'PLAY_DISCARD'
  const youCanDeclare = yourTurnToDiscard && !!winningResult(you)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  useEffect(() => setSelected(new Set()), [game.phase])
  const [highlightedIds, setHighlightedIds] = useState<Set<number> | null>(null)
  // Hovering a call-window option previews "the card as if I made that play": the
  // called meld is added to exposures and its non-discard tiles removed from the
  // rack, so MahjongCard's viability shading reacts exactly as it would post-call.
  const [previewMeld, setPreviewMeld] = useState<Meld | null>(null)
  useEffect(() => setPreviewMeld(null), [game.phase])
  const otherKnownTiles = [
    ...game.discards.map((d) => d.tile),
    ...opponents.flatMap((p) => p.exposures.flatMap((m) => m.tiles)),
  ]
  const preview =
    previewMeld && game.lastDiscard
      ? (() => {
          const discardId = game.lastDiscard!.tile.id
          const usedIds = new Set(previewMeld.tiles.filter((t) => t.id !== discardId).map((t) => t.id))
          return {
            concealed: you.hand.filter((t) => !usedIds.has(t.id)),
            exposures: [...you.exposures, previewMeld],
            otherKnownTiles: otherKnownTiles.filter((t) => t.id !== discardId),
          }
        })()
      : null

  const maxSelectable = isCharlestonPass ? 3 : 3 // courtesy also caps at 3
  const toggleTile = (id: number, kind: string) => {
    if (isJoker(kind)) return // jokers can never be passed
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxSelectable) next.add(id)
      return next
    })
  }

  const turnName = currentPlayer(game).name
  const phaseLabel =
    game.phase === 'PLAY_DRAW'
      ? 'drawing'
      : game.phase === 'PLAY_DISCARD'
        ? 'to discard'
        : isCallWindow
          ? 'discarded — up for grabs'
          : isCharlestonPass
            ? CHARLESTON_LABEL[game.phase]
            : isCharlestonDecision
              ? 'Second Charleston?'
              : isCourtesy
                ? 'Courtesy pass'
                : ''

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" title="Back to charlieguthrie.com">
          🀄 Charlie&nbsp;Mah&nbsp;Jongg
        </a>
        <div className="status">
          <span className="pill">Wall: {game.wall.length}</span>
          <span className="pill">Seed: {game.seed}</span>
          {!gameOver && (
            <span className="pill pill-turn">
              {isCharlestonPass || isCharlestonDecision || isCourtesy ? phaseLabel : `${turnName} ${phaseLabel}`}
            </span>
          )}
        </div>
        <button type="button" className="btn" disabled={history.length === 0} onClick={() => undo()}>
          Undo
        </button>
        <button type="button" className="btn" onClick={() => newGame()}>
          New Game
        </button>
      </header>

      <main className="table">
        <section className="opponents">
          {opponents.map((p) => (
            <OpponentCard key={p.seat} p={p} active={game.turn === p.seat && !gameOver && !isCharlestonPass && !isCharlestonDecision && !isCourtesy} />
          ))}
        </section>

        <section className="center">
          <div className="discard-area">
            <div className="discard-label">Discard pile · {game.discards.length}</div>
            <DiscardPile discards={game.discards} playerNames={game.players.map((p) => p.name)} />

            {isCallWindow && (
              <div className="call-prompt">
                <div className="call-prompt-title">Call this tile?</div>
                <div className="call-prompt-actions">
                  {game.humanCanMahjong && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => dispatch({ type: 'CALL_MAHJONG' })}
                      onMouseEnter={() => setHighlightedIds(new Set(you.hand.map((t) => t.id)))}
                      onMouseLeave={() => setHighlightedIds(null)}
                    >
                      Mah Jongg!
                    </button>
                  )}
                  {game.humanOptions?.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn"
                      onClick={() => dispatch({ type: 'CALL_EXPOSE', meld: opt.meld })}
                      onMouseEnter={() => {
                        setHighlightedIds(
                          new Set(
                            opt.meld.tiles
                              .filter((t) => t.id !== game.lastDiscard?.tile.id)
                              .map((t) => t.id),
                          ),
                        )
                        setPreviewMeld(opt.meld)
                      }}
                      onMouseLeave={() => {
                        setHighlightedIds(null)
                        setPreviewMeld(null)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'PASS_CALL' })}>
                    Pass
                  </button>
                </div>
              </div>
            )}

            {isCharlestonDecision && (
              <div className="call-prompt">
                <div className="call-prompt-title">Continue to a second Charleston?</div>
                <div className="call-prompt-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => dispatch({ type: 'CHARLESTON_CONTINUE', value: true })}
                  >
                    Yes, continue
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => dispatch({ type: 'CHARLESTON_CONTINUE', value: false })}
                  >
                    No, start playing
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={`you${yourTurnToDiscard || isCharlestonPass || isCourtesy ? ' you-active' : ''}`}>
          <div className="you-header">
            <span className="you-name">You · East wind</span>
            <span className="you-hint">
              {isCharlestonPass
                ? `Select 3 tiles to pass ${CHARLESTON_LABEL[game.phase].split(': pass ')[1]} (${selected.size}/3) — never jokers`
                : isCourtesy
                  ? `Optional: select 0-3 tiles to swap with the player across (${selected.size}/3)`
                  : isCallWindow
                    ? 'Respond to the call prompt above'
                    : yourTurnToDiscard
                      ? youCanDeclare
                        ? 'You can declare Mah Jongg!'
                        : 'Click a tile to discard'
                      : 'Waiting for other players…'}
            </span>
            {youCanDeclare && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => dispatch({ type: 'DECLARE_MAHJONG' })}
              >
                Mah Jongg!
              </button>
            )}
            {isCharlestonPass && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={selected.size !== 3}
                onClick={() => dispatch({ type: 'CHARLESTON_PASS', tileIds: [...selected] })}
              >
                Pass 3 tiles
              </button>
            )}
            {isCourtesy && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => dispatch({ type: 'COURTESY_PASS', tileIds: [...selected] })}
              >
                {selected.size === 0 ? 'Skip courtesy pass' : `Pass ${selected.size} tile(s)`}
              </button>
            )}
          </div>
          {you.exposures.length > 0 && (
            <div className="exposures">
              {you.exposures.map((m, i) => (
                <div key={i} className="meld">
                  {m.tiles.map((t) => (
                    <Tile key={t.id} id={t.id} kind={t.kind} small />
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="rack">
            <HandRack
              tiles={you.hand}
              selectable={isCharlestonPass || isCourtesy}
              selected={selected}
              onToggleSelect={toggleTile}
              onDiscard={(tileId) => dispatch({ type: 'DISCARD', tileId })}
              canDiscard={yourTurnToDiscard}
              highlightedIds={highlightedIds ?? undefined}
            />
          </div>
        </section>
      </main>

      <section className="mahjong-card-wrap">
        <MahjongCard
          hands={HANDS}
          concealed={preview?.concealed ?? you.hand}
          exposures={preview?.exposures ?? you.exposures}
          otherKnownTiles={preview?.otherKnownTiles ?? otherKnownTiles}
          onHighlightChange={setHighlightedIds}
        />
      </section>

      <aside className="log">
        {game.log
          .slice(-6)
          .reverse()
          .map((line, i) => (
            <div key={game.log.length - i} className={i === 0 ? 'log-line log-latest' : 'log-line'}>
              {line}
            </div>
          ))}
      </aside>

      {gameOver && (
        game.phase === 'GAME_OVER_WIN' ? (
          <WinScreen winner={game.players[game.winner!]} result={game.winResult} onPlayAgain={() => newGame()} />
        ) : (
          <div className="overlay">
            <div className="overlay-card">
              <h1>Wall game — no winner</h1>
              <button type="button" className="btn btn-primary" onClick={() => newGame()}>
                Play again
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function OpponentCard({ p, active }: { p: Player; active: boolean }) {
  return (
    <div className={`opponent${active ? ' opponent-active' : ''}`}>
      <div className="opponent-head">
        <span className="opponent-name">{p.name}</span>
        <span className="opponent-wind">{p.wind}</span>
      </div>
      {p.exposures.length > 0 && (
        <div className="exposures">
          {p.exposures.map((m, i) => (
            <div key={i} className="meld">
              {m.tiles.map((t) => (
                <Tile key={t.id} id={t.id} kind={t.kind} small />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="opponent-tiles">
        <AnimatePresence>
          {p.hand.map((t) => (
            <Tile key={t.id} id={t.id} kind={t.kind} faceDown small />
          ))}
        </AnimatePresence>
      </div>
      <div className="opponent-count">{p.hand.length} tiles</div>
    </div>
  )
}
