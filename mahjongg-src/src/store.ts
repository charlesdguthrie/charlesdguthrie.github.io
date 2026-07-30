// The store is the single side-effecting layer: it applies pure reducers and drives
// the turn cadence, scheduling AI (and the human's automatic draw) via setTimeout so
// the game plays out at a watchable pace. All game logic lives in the engine.

import { create } from 'zustand'
import {
  createGame,
  reduce,
  randomSeed,
  winningResult,
  assertInvariants,
  type Action,
  type GameState,
} from './engine/state'
import { chooseDiscard } from './engine/ai'

const HUMAN_DRAW_DELAY = 250
const AI_DELAY = 650

interface Store {
  game: GameState
  /** Every prior game state, most recent last; used to undo. */
  history: GameState[]
  /** Dispatch a player action (human input). */
  dispatch: (action: Action) => void
  newGame: (seed?: number) => void
  undo: () => void
}

export const useGame = create<Store>((set, get) => {
  let timer: ReturnType<typeof setTimeout> | null = null

  const apply = (action: Action) => {
    const prev = get().game
    const next = reduce(prev, action)
    if (import.meta.env.DEV) {
      try {
        assertInvariants(next)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Invariant violation after', action, e)
      }
    }
    set({ game: next, history: [...get().history, prev] })
    schedule()
  }

  // Advance the game automatically for whichever seat is "on the clock":
  // the human auto-draws (then waits to discard); the AI draws, then either
  // declares a self-drawn mah jongg or discards its least-useful tile.
  const schedule = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const g = get().game
    if (g.phase === 'GAME_OVER_WIN' || g.phase === 'GAME_OVER_WALL') return
    if (g.phase === 'CALL_WINDOW') return // waiting on the human's call decision (App renders the prompt)
    if (g.phase.startsWith('CHARLESTON_') || g.phase === 'COURTESY_DECISION') return // fully human-driven; AI picks are computed atomically when the human submits
    const p = g.players[g.turn]

    if (p.isHuman) {
      if (g.phase === 'PLAY_DRAW') {
        timer = setTimeout(() => apply({ type: 'DRAW' }), HUMAN_DRAW_DELAY)
      }
      // PLAY_DISCARD for the human: wait for a click (App renders the options).
      return
    }

    // AI seat.
    if (g.phase === 'PLAY_DRAW') {
      timer = setTimeout(() => apply({ type: 'DRAW' }), AI_DELAY)
    } else if (g.phase === 'PLAY_DISCARD') {
      timer = setTimeout(() => {
        const cur = get().game.players[get().game.turn]
        if (winningResult(cur)) {
          apply({ type: 'DECLARE_MAHJONG' })
        } else {
          apply({ type: 'DISCARD', tileId: chooseDiscard(cur).id })
        }
      }, AI_DELAY)
    }
  }

  const startSeed = seedFromUrl() ?? randomSeed()

  // Kick the loop once for the initial state (dealer opens; if human, we just wait).
  queueMicrotask(schedule)

  return {
    game: createGame(startSeed),
    history: [],
    dispatch: (action) => apply(action),
    newGame: (seed) => {
      if (timer) clearTimeout(timer)
      set({ game: createGame(seed ?? randomSeed()), history: [] })
      schedule()
    },
    undo: () => {
      const history = get().history
      if (history.length === 0) return
      if (timer) clearTimeout(timer)
      const prev = history[history.length - 1]
      set({ game: prev, history: history.slice(0, -1) })
      schedule()
    },
  }
})

function seedFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('seed')
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n >>> 0 : null
}
