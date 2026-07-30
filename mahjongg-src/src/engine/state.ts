// Game state + pure reducers. This module is framework-free and side-effect-free:
// `reduce(state, action)` returns a new state and never touches the DOM, the clock,
// or global RNG. The only randomness enters at NEW_GAME (seeded shuffle), which makes
// an entire game reproducible from its seed. The Zustand store (store.ts) is the sole
// side-effecting layer that applies reducers and schedules AI turns.

import {
  buildShuffledWall,
  deal,
  describeKind,
  isJoker,
  NUM_PLAYERS,
  WINDS,
  type Meld,
  type Tile,
  type Wind,
} from './tiles'
import { findWin, type MatchResult } from './match'
import { mulberry32, randInt } from './rng'
import { aiCallIntent, canCallMahjong, describeMeld, legalExposures, sameMeld, type CallIntent } from './calls'
import { chooseCharlestonPass } from './ai'

export type { Meld, MeldType } from './tiles'
export type { CallIntent } from './calls'

export interface Player {
  seat: number
  name: string
  isHuman: boolean
  wind: Wind
  hand: Tile[] // concealed tiles
  exposures: Meld[] // face-up called melds
}

export type Phase =
  | 'CHARLESTON_1_RIGHT'
  | 'CHARLESTON_1_ACROSS'
  | 'CHARLESTON_1_LEFT'
  | 'CHARLESTON_2_DECISION'
  | 'CHARLESTON_2_LEFT'
  | 'CHARLESTON_2_ACROSS'
  | 'CHARLESTON_2_RIGHT'
  | 'COURTESY_DECISION'
  | 'PLAY_DRAW'
  | 'PLAY_DISCARD'
  | 'CALL_WINDOW'
  | 'GAME_OVER_WIN'
  | 'GAME_OVER_WALL'

/** An exposure the human could legally make on the tile currently up for a call. */
export interface HumanCallOption {
  meld: Meld // concrete tiles (called tile + tiles from hand)
  label: string
}

export interface GameState {
  seed: number
  phase: Phase
  turn: number // current seat
  players: Player[]
  wall: Tile[]
  discards: { tile: Tile; seat: number }[]
  lastDiscard: { tile: Tile; seat: number } | null
  // During CALL_WINDOW: the AI seats' intents (already decided) and, if the human
  // may call, the options presented to them. The window waits for the human only
  // when humanOptions is non-null (they can expose) or humanCanMahjong is true.
  pendingAiIntents: CallIntent[]
  humanOptions: HumanCallOption[] | null
  humanCanMahjong: boolean
  winner: number | null
  winResult: MatchResult | null
  log: string[]
}

export type Action =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'CHARLESTON_PASS'; tileIds: number[] } // human's 3 tiles for the current Charleston pass
  | { type: 'CHARLESTON_CONTINUE'; value: boolean } // human's choice at CHARLESTON_2_DECISION
  | { type: 'COURTESY_PASS'; tileIds: number[] } // human's 0-3 tiles for the courtesy exchange
  | { type: 'DRAW' }
  | { type: 'DISCARD'; tileId: number }
  | { type: 'DECLARE_MAHJONG' }
  | { type: 'CALL_EXPOSE'; meld: Meld } // human takes the discard to expose a meld
  | { type: 'CALL_MAHJONG' } // human takes the discard to win
  | { type: 'PASS_CALL' } // human declines to call

const SEAT_NAMES = ['You', 'Rina (N)', 'Wade (W)', 'Sara (S)']

/** Next seat counterclockwise — also "pass to the right" in Charleston terms. */
export function nextSeat(seat: number): number {
  return (seat + 1) % NUM_PLAYERS
}

/** Seat to the right (same as turn order — play proceeds counterclockwise). */
export const rightOf = nextSeat
/** Seat directly across the table. */
export function acrossOf(seat: number): number {
  return (seat + 2) % NUM_PLAYERS
}
/** Seat to the left (previous in turn order). */
export function leftOf(seat: number): number {
  return (seat + NUM_PLAYERS - 1) % NUM_PLAYERS
}

/** All 14-ish tiles a player would show for a win: concealed + exposed. */
export function playerAllTiles(p: Player): Tile[] {
  return [...p.hand, ...p.exposures.flatMap((m) => m.tiles)]
}

export function currentPlayer(s: GameState): Player {
  return s.players[s.turn]
}

/** Is the given player currently able to declare a valid mah jongg? */
export function winningResult(p: Player): MatchResult | null {
  return findWin(playerAllTiles(p), { hasExposures: p.exposures.length > 0 })
}

// --- game construction ------------------------------------------------------

export function createGame(seed: number): GameState {
  const rng = mulberry32(seed)
  const wall = buildShuffledWall(rng)
  const { hands, wall: rest } = deal(wall)
  const players: Player[] = []
  for (let seat = 0; seat < NUM_PLAYERS; seat++) {
    players.push({
      seat,
      name: SEAT_NAMES[seat],
      isHuman: seat === 0,
      wind: WINDS[seat],
      hand: hands[seat],
      exposures: [],
    })
  }
  return {
    seed,
    // Dealer (seat 0) holds 14 tiles throughout Charleston and opens by discarding
    // once play starts — no draw first. Charleston passes don't change hand sizes:
    // everyone gives 3 and receives 3 each round.
    phase: 'CHARLESTON_1_RIGHT',
    turn: 0,
    players,
    wall: rest,
    discards: [],
    lastDiscard: null,
    pendingAiIntents: [],
    humanOptions: null,
    humanCanMahjong: false,
    winner: null,
    winResult: null,
    log: [`New game (seed ${seed}). You are East and deal first. First Charleston: pass 3 to your right.`],
  }
}

/** Convenience for the store/UI: a fresh random seed. */
export function randomSeed(): number {
  return randInt(mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0), 1e9)
}

// --- reducer ----------------------------------------------------------------

function log(s: GameState, msg: string): string[] {
  return [...s.log, msg].slice(-100)
}

/**
 * Resolve a completed call window given every non-discarder seat's intent.
 * Priority: MAHJONG beats EXPOSE; ties broken by nearest seat counterclockwise
 * from the discarder. All-pass leaves the discard on the pile and advances play.
 */
export function resolveCallWindow(state: GameState, intents: CallIntent[]): GameState {
  const { tile, seat: discarderSeat } = state.lastDiscard!
  const seatDistance = (seat: number) => (seat - discarderSeat + NUM_PLAYERS) % NUM_PLAYERS

  const claimants = intents.filter((i): i is Exclude<CallIntent, { kind: 'PASS' }> => i.kind !== 'PASS')
  claimants.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'MAHJONG' ? -1 : 1
    return seatDistance(a.seat) - seatDistance(b.seat)
  })
  const winner = claimants[0]

  const cleared = { pendingAiIntents: [], humanOptions: null, humanCanMahjong: false }
  const withoutCalledDiscard = (s: GameState) => ({ ...s, discards: s.discards.filter((d) => d.tile.id !== tile.id) })

  if (!winner) {
    return {
      ...state,
      ...cleared,
      phase: 'PLAY_DRAW',
      turn: nextSeat(discarderSeat),
    }
  }

  const caller = state.players[winner.seat]

  if (winner.kind === 'MAHJONG') {
    const exposureTiles = caller.exposures.flatMap((m) => m.tiles)
    const result = findWin([...caller.hand, tile, ...exposureTiles], { hasExposures: caller.exposures.length > 0 })!
    // The winner picks up the called tile into their hand before it's scored —
    // otherwise it would vanish from discards without landing anywhere.
    const players = state.players.map((pl) => (pl.seat === caller.seat ? { ...pl, hand: [...pl.hand, tile] } : pl))
    const s = withoutCalledDiscard({ ...state, players })
    return {
      ...s,
      ...cleared,
      phase: 'GAME_OVER_WIN',
      winner: caller.seat,
      winResult: result,
      log: log(s, `${caller.name} called Mah Jongg on ${describeKind(tile.kind)} — ${result.def.section} (${result.def.points} pts)!`),
    }
  }

  // EXPOSE: lock in the meld, remove its hand tiles, hand the turn to the caller
  // to discard immediately (no draw).
  const meld: Meld = { ...winner.meld, calledFrom: discarderSeat }
  const usedIds = new Set(meld.tiles.filter((t) => t.id !== tile.id).map((t) => t.id))
  const players = state.players.map((pl) =>
    pl.seat === caller.seat
      ? { ...pl, hand: pl.hand.filter((t) => !usedIds.has(t.id)), exposures: [...pl.exposures, meld] }
      : pl,
  )
  const s = withoutCalledDiscard({ ...state, players })
  return {
    ...s,
    ...cleared,
    turn: caller.seat,
    phase: 'PLAY_DISCARD',
    log: log(s, `${caller.name} called ${describeKind(tile.kind)} to expose a ${meld.type}.`),
  }
}

// --- Charleston -------------------------------------------------------------

type CharlestonPhase =
  | 'CHARLESTON_1_RIGHT'
  | 'CHARLESTON_1_ACROSS'
  | 'CHARLESTON_1_LEFT'
  | 'CHARLESTON_2_LEFT'
  | 'CHARLESTON_2_ACROSS'
  | 'CHARLESTON_2_RIGHT'

const CHARLESTON_DIRECTION: Record<CharlestonPhase, (seat: number) => number> = {
  CHARLESTON_1_RIGHT: rightOf,
  CHARLESTON_1_ACROSS: acrossOf,
  CHARLESTON_1_LEFT: leftOf,
  CHARLESTON_2_LEFT: leftOf,
  CHARLESTON_2_ACROSS: acrossOf,
  CHARLESTON_2_RIGHT: rightOf,
}

const CHARLESTON_NEXT_PHASE: Record<CharlestonPhase, Phase> = {
  CHARLESTON_1_RIGHT: 'CHARLESTON_1_ACROSS',
  CHARLESTON_1_ACROSS: 'CHARLESTON_1_LEFT',
  CHARLESTON_1_LEFT: 'CHARLESTON_2_DECISION',
  CHARLESTON_2_LEFT: 'CHARLESTON_2_ACROSS',
  CHARLESTON_2_ACROSS: 'CHARLESTON_2_RIGHT',
  CHARLESTON_2_RIGHT: 'COURTESY_DECISION',
}

const CHARLESTON_DIRECTION_LABEL: Record<CharlestonPhase, string> = {
  CHARLESTON_1_RIGHT: 'right',
  CHARLESTON_1_ACROSS: 'across',
  CHARLESTON_1_LEFT: 'left',
  CHARLESTON_2_LEFT: 'left',
  CHARLESTON_2_ACROSS: 'across',
  CHARLESTON_2_RIGHT: 'right',
}

function isCharlestonPhase(phase: Phase): phase is CharlestonPhase {
  return phase in CHARLESTON_DIRECTION
}

/** Apply one Charleston (or courtesy) pass: everyone gives `outgoing[seat]`, and
 * receives from whichever seat's outgoing tiles are routed to them by `dir`. */
function applyPass(state: GameState, outgoing: Record<number, Tile[]>, dir: (seat: number) => number): Player[] {
  return state.players.map((p) => {
    const giveIds = new Set(outgoing[p.seat].map((t) => t.id))
    const kept = p.hand.filter((t) => !giveIds.has(t.id))
    const sender = state.players.find((other) => dir(other.seat) === p.seat)!
    return { ...p, hand: [...kept, ...outgoing[sender.seat]] }
  })
}

function nextCharlestonLogLine(next: Phase): string | null {
  if (next === 'CHARLESTON_2_DECISION') return 'First Charleston complete. Continue to a second Charleston?'
  if (next === 'COURTESY_DECISION') return 'Second Charleston complete. Optional courtesy pass — swap 0-3 tiles across?'
  if (isCharlestonPhase(next)) return `Pass 3 to your ${CHARLESTON_DIRECTION_LABEL[next]}.`
  return null
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.seed)

    case 'CHARLESTON_PASS': {
      if (!isCharlestonPhase(state.phase)) return state
      const dir = CHARLESTON_DIRECTION[state.phase]
      const human = state.players[0]
      if (action.tileIds.length !== 3) return state
      const humanTiles = action.tileIds
        .map((id) => human.hand.find((t) => t.id === id))
        .filter((t): t is Tile => !!t)
      if (humanTiles.length !== 3 || humanTiles.some((t) => isJoker(t.kind))) return state

      const outgoing: Record<number, Tile[]> = { 0: humanTiles }
      for (const p of state.players) {
        if (p.seat !== 0) outgoing[p.seat] = chooseCharlestonPass(p, 3)
      }

      const players = applyPass(state, outgoing, dir)
      const nextPhase = CHARLESTON_NEXT_PHASE[state.phase]
      const line = nextCharlestonLogLine(nextPhase)
      return { ...state, players, phase: nextPhase, log: line ? log(state, line) : state.log }
    }

    case 'CHARLESTON_CONTINUE': {
      if (state.phase !== 'CHARLESTON_2_DECISION') return state
      const nextPhase: Phase = action.value ? 'CHARLESTON_2_LEFT' : 'COURTESY_DECISION'
      const line = action.value
        ? nextCharlestonLogLine(nextPhase)!
        : 'Skipping the second Charleston. Optional courtesy pass — swap 0-3 tiles across?'
      return { ...state, phase: nextPhase, log: log(state, line) }
    }

    case 'COURTESY_PASS': {
      if (state.phase !== 'COURTESY_DECISION') return state
      if (action.tileIds.length > 3) return state
      const human = state.players[0]
      const humanTiles = action.tileIds
        .map((id) => human.hand.find((t) => t.id === id))
        .filter((t): t is Tile => !!t)
      if (humanTiles.length !== action.tileIds.length || humanTiles.some((t) => isJoker(t.kind))) return state

      const count = humanTiles.length
      const acrossSeat = acrossOf(0)
      if (count === 0) {
        return { ...state, phase: 'PLAY_DISCARD', turn: 0, log: log(state, 'No courtesy tiles exchanged. Play begins!') }
      }

      // Only the human's pair (seat 0 <-> across) exchanges in this MVP — the other
      // pair's courtesy pass is a rarely-used optional rule we omit for simplicity.
      const across = state.players[acrossSeat]
      const acrossTiles = chooseCharlestonPass(across, count)
      const players = state.players.map((p) => {
        if (p.seat === 0) return { ...p, hand: [...p.hand.filter((t) => !humanTiles.some((h) => h.id === t.id)), ...acrossTiles] }
        if (p.seat === acrossSeat) return { ...p, hand: [...p.hand.filter((t) => !acrossTiles.some((a) => a.id === t.id)), ...humanTiles] }
        return p
      })
      return {
        ...state,
        players,
        phase: 'PLAY_DISCARD',
        turn: 0,
        log: log(state, `Courtesy exchange: ${count} tile(s) with ${across.name}. Play begins!`),
      }
    }

    case 'DRAW': {
      if (state.phase !== 'PLAY_DRAW') return state
      if (state.wall.length === 0) {
        return { ...state, phase: 'GAME_OVER_WALL', log: log(state, 'Wall exhausted — a wall game (no winner).') }
      }
      const wall = state.wall.slice()
      const tile = wall.shift()!
      const players = state.players.map((p) =>
        p.seat === state.turn ? { ...p, hand: [...p.hand, tile] } : p,
      )
      return { ...state, wall, players, phase: 'PLAY_DISCARD' }
    }

    case 'DISCARD': {
      if (state.phase !== 'PLAY_DISCARD') return state
      const discarderSeat = state.turn
      const p = state.players[discarderSeat]
      const tile = p.hand.find((t) => t.id === action.tileId)
      if (!tile) return state
      const players = state.players.map((pl) =>
        pl.seat === discarderSeat ? { ...pl, hand: pl.hand.filter((t) => t.id !== action.tileId) } : pl,
      )
      const discards = [...state.discards, { tile, seat: discarderSeat }]
      const afterDiscard: GameState = {
        ...state,
        players,
        discards,
        lastDiscard: { tile, seat: discarderSeat },
        phase: 'CALL_WINDOW',
        log: log(state, `${p.name} discarded ${describeKind(tile.kind)}.`),
      }

      // Every other seat gets a chance to call. AI decisions are made immediately
      // (pure functions of public info); the human's decision, if any, is offered
      // via humanOptions/humanCanMahjong and the reducer waits for their action.
      const aiIntents: CallIntent[] = []
      let humanOptions: HumanCallOption[] | null = null
      let humanCanMahjong = false
      for (const other of players) {
        if (other.seat === discarderSeat) continue
        if (other.isHuman) {
          humanCanMahjong = canCallMahjong(other, tile)
          const exposures = legalExposures(other, tile)
          humanOptions = exposures.length > 0 ? exposures.map((meld) => ({ meld, label: describeMeld(meld) })) : null
        } else {
          aiIntents.push(aiCallIntent(other, tile, other.seat))
        }
      }

      const humanEligible = humanCanMahjong || !!(humanOptions && humanOptions.length > 0)
      if (!humanEligible) {
        return resolveCallWindow(afterDiscard, aiIntents)
      }
      return { ...afterDiscard, pendingAiIntents: aiIntents, humanOptions, humanCanMahjong }
    }

    case 'DECLARE_MAHJONG': {
      const p = state.players[state.turn]
      const result = winningResult(p)
      if (!result) return state
      return {
        ...state,
        phase: 'GAME_OVER_WIN',
        winner: p.seat,
        winResult: result,
        log: log(state, `${p.name} declared Mah Jongg — ${result.def.section} (${result.def.points} pts)!`),
      }
    }

    case 'CALL_MAHJONG': {
      if (state.phase !== 'CALL_WINDOW' || !state.humanCanMahjong) return state
      return resolveCallWindow(state, [{ seat: 0, kind: 'MAHJONG' }, ...state.pendingAiIntents])
    }

    case 'CALL_EXPOSE': {
      if (state.phase !== 'CALL_WINDOW') return state
      const isOffered = state.humanOptions?.some((o) => sameMeld(o.meld, action.meld))
      if (!isOffered) return state
      return resolveCallWindow(state, [{ seat: 0, kind: 'EXPOSE', meld: action.meld }, ...state.pendingAiIntents])
    }

    case 'PASS_CALL': {
      if (state.phase !== 'CALL_WINDOW') return state
      return resolveCallWindow(state, [{ seat: 0, kind: 'PASS' }, ...state.pendingAiIntents])
    }
  }
}

// --- invariants (used by tests and the dev panel) ---------------------------

/** Total tiles across all locations — must always be 152. */
export function totalTiles(s: GameState): number {
  let n = s.wall.length + s.discards.length
  for (const p of s.players) n += p.hand.length + p.exposures.reduce((a, m) => a + m.tiles.length, 0)
  return n
}

/** Throws if any core invariant is violated. */
export function assertInvariants(s: GameState): void {
  if (totalTiles(s) !== 152) throw new Error(`tile conservation broken: ${totalTiles(s)} != 152`)
  const ids = new Set<number>()
  const add = (t: Tile) => {
    if (ids.has(t.id)) throw new Error(`duplicate tile id ${t.id}`)
    ids.add(t.id)
  }
  s.wall.forEach(add)
  s.discards.forEach((d) => add(d.tile))
  for (const p of s.players) {
    p.hand.forEach(add)
    p.exposures.forEach((m) => m.tiles.forEach(add))
  }
}
