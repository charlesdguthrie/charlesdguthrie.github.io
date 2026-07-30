import { describe, it, expect } from 'vitest'
import {
  createGame,
  reduce,
  resolveCallWindow,
  winningResult,
  assertInvariants,
  totalTiles,
  nextSeat,
  type GameState,
  type CallIntent,
  type Meld,
} from '../state'
import { chooseDiscard, chooseCharlestonPass } from '../ai'
import { aiCallIntent } from '../calls'
import type { Tile, TileKind } from '../tiles'

let _id = 900000
const tiles = (...kinds: TileKind[]): Tile[] => kinds.map((kind) => ({ id: _id++, kind }))

const CHARLESTON_PHASES = new Set([
  'CHARLESTON_1_RIGHT',
  'CHARLESTON_1_ACROSS',
  'CHARLESTON_1_LEFT',
  'CHARLESTON_2_LEFT',
  'CHARLESTON_2_ACROSS',
  'CHARLESTON_2_RIGHT',
])

/** Play a game to completion the way the store would, but synchronously. Drives
 * the human through Charleston/courtesy the same way an AI would (least-useful
 * tiles, always continue to the second Charleston, always take the courtesy pass). */
function playOut(seed: number): GameState {
  let g = createGame(seed)
  for (let i = 0; i < 500; i++) {
    if (g.phase === 'GAME_OVER_WIN' || g.phase === 'GAME_OVER_WALL') break
    const p = g.players[g.turn]
    if (CHARLESTON_PHASES.has(g.phase)) {
      const human = g.players[0]
      const tileIds = chooseCharlestonPass(human, 3).map((t) => t.id)
      g = reduce(g, { type: 'CHARLESTON_PASS', tileIds })
    } else if (g.phase === 'CHARLESTON_2_DECISION') {
      g = reduce(g, { type: 'CHARLESTON_CONTINUE', value: true })
    } else if (g.phase === 'COURTESY_DECISION') {
      const human = g.players[0]
      const tileIds = chooseCharlestonPass(human, 3).map((t) => t.id)
      g = reduce(g, { type: 'COURTESY_PASS', tileIds })
    } else if (g.phase === 'PLAY_DRAW') {
      g = reduce(g, { type: 'DRAW' })
    } else if (g.phase === 'PLAY_DISCARD') {
      g = winningResult(p)
        ? reduce(g, { type: 'DECLARE_MAHJONG' })
        : reduce(g, { type: 'DISCARD', tileId: chooseDiscard(p).id })
    } else if (g.phase === 'CALL_WINDOW') {
      // Simulate the human's call decision the same way an AI would.
      const human = g.players[0]
      const intent = aiCallIntent(human, g.lastDiscard!.tile, 0)
      g =
        intent.kind === 'MAHJONG'
          ? reduce(g, { type: 'CALL_MAHJONG' })
          : intent.kind === 'EXPOSE'
            ? reduce(g, { type: 'CALL_EXPOSE', meld: intent.meld })
            : reduce(g, { type: 'PASS_CALL' })
    }
    assertInvariants(g)
  }
  return g
}

describe('game setup', () => {
  it('creates a valid initial state', () => {
    const g = createGame(1)
    expect(totalTiles(g)).toBe(152)
    expect(g.players[0].hand).toHaveLength(14)
    expect(g.players[1].hand).toHaveLength(13)
    expect(g.phase).toBe('CHARLESTON_1_RIGHT')
    expect(g.turn).toBe(0)
    assertInvariants(g)
  })

  it('is deterministic for a seed', () => {
    const a = createGame(99).players[0].hand.map((t) => t.kind)
    const b = createGame(99).players[0].hand.map((t) => t.kind)
    expect(a).toEqual(b)
  })
})

describe('turn order', () => {
  it('advances counterclockwise', () => {
    expect(nextSeat(0)).toBe(1)
    expect(nextSeat(3)).toBe(0)
  })
})

describe('Charleston', () => {
  it('starts in CHARLESTON_1_RIGHT and rotates through all three first-round passes', () => {
    let g = createGame(3)
    expect(g.phase).toBe('CHARLESTON_1_RIGHT')
    const pass = () => {
      const human = g.players[0]
      const tileIds = human.hand
        .filter((t) => t.kind !== 'J')
        .slice(0, 3)
        .map((t) => t.id)
      g = reduce(g, { type: 'CHARLESTON_PASS', tileIds })
    }
    pass()
    expect(g.phase).toBe('CHARLESTON_1_ACROSS')
    pass()
    expect(g.phase).toBe('CHARLESTON_1_LEFT')
    pass()
    expect(g.phase).toBe('CHARLESTON_2_DECISION')
    // Hand sizes are preserved throughout — everyone gives 3, everyone gets 3.
    expect(g.players[0].hand).toHaveLength(14)
    expect(g.players[1].hand).toHaveLength(13)
    assertInvariants(g)
  })

  it("routes the human's passed tiles to the correct seat for each direction", () => {
    const base = createGame(4)
    const marker = tiles('WN', 'WE', 'WS')
    const human = { ...base.players[0], hand: [...base.players[0].hand.slice(3), ...marker] }
    let g = { ...base, players: base.players.map((p) => (p.seat === 0 ? human : p)) }
    const markerIds = marker.map((t) => t.id)

    g = reduce(g, { type: 'CHARLESTON_PASS', tileIds: markerIds })
    // Pass right: seat 0 -> seat 1.
    expect(markerIds.every((id) => g.players[1].hand.some((t) => t.id === id))).toBe(true)
    expect(markerIds.every((id) => !g.players[0].hand.some((t) => t.id === id))).toBe(true)
    assertInvariants(g)
  })

  it('rejects a pass that is not exactly 3 tiles', () => {
    const g = createGame(1)
    const tooFew = g.players[0].hand
      .filter((t) => t.kind !== 'J')
      .slice(0, 2)
      .map((t) => t.id)
    const result = reduce(g, { type: 'CHARLESTON_PASS', tileIds: tooFew })
    expect(result).toBe(g) // unchanged
  })

  it('rejects a pass that includes a joker', () => {
    const base = createGame(1)
    const joker = tiles('J')[0]
    const rest = base.players[0].hand.filter((t) => t.kind !== 'J').slice(0, 2)
    const human = { ...base.players[0], hand: [...base.players[0].hand.slice(3), joker, ...rest] }
    const g = { ...base, players: base.players.map((p) => (p.seat === 0 ? human : p)) }
    const result = reduce(g, { type: 'CHARLESTON_PASS', tileIds: [joker.id, ...rest.map((t) => t.id)] })
    expect(result).toBe(g) // unchanged
  })

  it('skips the second Charleston when declined, going to the courtesy decision', () => {
    const g: GameState = { ...createGame(1), phase: 'CHARLESTON_2_DECISION' }
    const result = reduce(g, { type: 'CHARLESTON_CONTINUE', value: false })
    expect(result.phase).toBe('COURTESY_DECISION')
  })

  it('continues to the second Charleston when accepted', () => {
    const g: GameState = { ...createGame(1), phase: 'CHARLESTON_2_DECISION' }
    const result = reduce(g, { type: 'CHARLESTON_CONTINUE', value: true })
    expect(result.phase).toBe('CHARLESTON_2_LEFT')
  })

  it('declining the courtesy pass (0 tiles) starts play immediately', () => {
    const g: GameState = { ...createGame(1), phase: 'COURTESY_DECISION' }
    const result = reduce(g, { type: 'COURTESY_PASS', tileIds: [] })
    expect(result.phase).toBe('PLAY_DISCARD')
    expect(result.turn).toBe(0)
    assertInvariants(result)
  })

  it('exchanges tiles with the across seat on a courtesy pass', () => {
    const base: GameState = { ...createGame(6), phase: 'COURTESY_DECISION' }
    const marker = tiles('DR', 'DG')
    const human = { ...base.players[0], hand: [...base.players[0].hand.slice(2), ...marker] }
    const g = { ...base, players: base.players.map((p) => (p.seat === 0 ? human : p)) }
    const markerIds = marker.map((t) => t.id)

    const result = reduce(g, { type: 'COURTESY_PASS', tileIds: markerIds })
    expect(result.phase).toBe('PLAY_DISCARD')
    // Across from seat 0 is seat 2.
    expect(markerIds.every((id) => result.players[2].hand.some((t) => t.id === id))).toBe(true)
    expect(result.players[0].hand).toHaveLength(14)
    expect(result.players[2].hand).toHaveLength(13)
    assertInvariants(result)
  })
})

describe('full game simulation', () => {
  it('always terminates with invariants intact, across many seeds', () => {
    // Charleston passes call the closeness scorer many extra times per game
    // (3 AI picks x 3 rounds x up to 7 passes), so 40 full games is slower than
    // the pre-Charleston suite — bump past the 5s default rather than trim seeds.
    // The real 72-hand card (vs. the smaller original set) adds real enumeration
    // work (three suit roles, dragon-color enumeration for several hands), so this
    // is bumped further still; per-decision cost in the actual browser game is
    // still well under a millisecond — this only stacks up across 40 full games.
    for (let seed = 1; seed <= 40; seed++) {
      const g = playOut(seed)
      expect(['GAME_OVER_WIN', 'GAME_OVER_WALL'], `seed ${seed}`).toContain(g.phase)
      expect(totalTiles(g)).toBe(152)
      if (g.phase === 'GAME_OVER_WIN') {
        expect(g.winner).not.toBeNull()
        expect(g.winResult).not.toBeNull()
      }
    }
  }, 45000)
})

describe('declaring mah jongg', () => {
  it('accepts a genuine winning hand and ends the game', () => {
    let g = createGame(5)
    // Force seat 0 to hold a complete EVEN-1 hand: pungs of 2,4 + kongs of 6,8 (Bam).
    const winning = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8', 'B8')
    g = { ...g, turn: 0, phase: 'PLAY_DISCARD', players: g.players.map((p) => (p.seat === 0 ? { ...p, hand: winning } : p)) }
    expect(winningResult(g.players[0])).not.toBeNull()
    g = reduce(g, { type: 'DECLARE_MAHJONG' })
    expect(g.phase).toBe('GAME_OVER_WIN')
    expect(g.winner).toBe(0)
    expect(g.winResult?.def.section).toBe('2468')
  })

  it('ignores a false declaration', () => {
    let g = createGame(5)
    // A random 14-tile junk hand that matches nothing.
    const junk = tiles('B1', 'B2', 'C3', 'C4', 'D5', 'D6', 'WN', 'WE', 'WS', 'WW', 'DR', 'DG', 'DW', 'F')
    g = { ...g, turn: 0, phase: 'PLAY_DISCARD', players: g.players.map((p) => (p.seat === 0 ? { ...p, hand: junk } : p)) }
    const before = g.phase
    g = reduce(g, { type: 'DECLARE_MAHJONG' })
    expect(g.phase).toBe(before) // unchanged
  })
})

describe('call window: end-to-end via DISCARD', () => {
  it('lets a non-discarder complete Mah Jongg by calling the discard, and the tile is not lost', () => {
    let g = createGame(9)
    const freshJunk = () => tiles('C1', 'C2', 'D3', 'D4', 'WN', 'WE', 'DR', 'DG', 'F', 'C9', 'D9', 'WS', 'WW')
    // Seat 2 is one B8 short of EVEN-1 (pungs of 2,4 + kongs of 6,8, Bam).
    const almostWinning = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    // Seat 1 (the discarder) holds the completing tile among junk.
    const discarderHand = [...tiles('C1', 'C2', 'D3', 'D4', 'WN', 'WE', 'DR', 'DG', 'F', 'C9', 'D9', 'WS'), tiles('B8')[0]]
    g = {
      ...g,
      turn: 1,
      phase: 'PLAY_DISCARD',
      players: g.players.map((p) => {
        if (p.seat === 1) return { ...p, hand: discarderHand }
        if (p.seat === 2) return { ...p, hand: almostWinning }
        return { ...p, hand: freshJunk() }
      }),
    }
    const discardedId = discarderHand[discarderHand.length - 1].id
    g = reduce(g, { type: 'DISCARD', tileId: discardedId })

    expect(g.phase).toBe('GAME_OVER_WIN')
    expect(g.winner).toBe(2)
    expect(g.winResult?.def.section).toBe('2468')
    // The regression this guards: the called tile must land in the winner's hand,
    // not vanish from the discard pile without being accounted for anywhere.
    expect(g.players[2].hand.some((t) => t.id === discardedId)).toBe(true)
    expect(g.discards.some((t) => t.tile.id === discardedId)).toBe(false)
  })
})

describe('resolveCallWindow: priority', () => {
  it('gives Mah Jongg priority over a simultaneous expose claim', () => {
    const base = createGame(1)
    const discardTile = tiles('B8')[0]
    const winning = tiles('B2', 'B2', 'B2', 'B4', 'B4', 'B4', 'B6', 'B6', 'B6', 'B6', 'B8', 'B8', 'B8')
    const state: GameState = {
      ...base,
      turn: 1,
      phase: 'CALL_WINDOW',
      lastDiscard: { tile: discardTile, seat: 1 },
      discards: [...base.discards, { tile: discardTile, seat: 1 }],
      players: base.players.map((p) => (p.seat === 3 ? { ...p, hand: winning } : p)),
    }
    const fakeMeld: Meld = { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') }
    const intents: CallIntent[] = [
      { seat: 2, kind: 'EXPOSE', meld: fakeMeld },
      { seat: 3, kind: 'MAHJONG' },
    ]
    const result = resolveCallWindow(state, intents)
    expect(result.phase).toBe('GAME_OVER_WIN')
    expect(result.winner).toBe(3)
    expect(result.players[2].exposures).toHaveLength(0) // the losing expose was never applied
  })

  it('breaks a tie between two expose claims by nearest seat counterclockwise', () => {
    const base = createGame(1)
    const discardTile = tiles('C1')[0]
    const state: GameState = {
      ...base,
      turn: 1,
      phase: 'CALL_WINDOW',
      lastDiscard: { tile: discardTile, seat: 1 },
      discards: [...base.discards, { tile: discardTile, seat: 1 }],
    }
    const intents: CallIntent[] = [
      { seat: 3, kind: 'EXPOSE', meld: { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') } },
      { seat: 2, kind: 'EXPOSE', meld: { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') } },
    ]
    // seat 2 is distance 1 from the discarder (seat 1); seat 3 is distance 2.
    const result = resolveCallWindow(state, intents)
    expect(result.turn).toBe(2)
    expect(result.phase).toBe('PLAY_DISCARD')
    expect(result.players[2].exposures).toHaveLength(1)
    expect(result.players[3].exposures).toHaveLength(0)
  })

  it('advances the turn and keeps the discard on the pile when everyone passes', () => {
    const base = createGame(1)
    const discardTile = tiles('C1')[0]
    const state: GameState = {
      ...base,
      turn: 1,
      phase: 'CALL_WINDOW',
      lastDiscard: { tile: discardTile, seat: 1 },
      discards: [...base.discards, { tile: discardTile, seat: 1 }],
    }
    const intents: CallIntent[] = [
      { seat: 0, kind: 'PASS' },
      { seat: 2, kind: 'PASS' },
      { seat: 3, kind: 'PASS' },
    ]
    const result = resolveCallWindow(state, intents)
    expect(result.phase).toBe('PLAY_DRAW')
    expect(result.turn).toBe(nextSeat(1))
    expect(result.discards.some((d) => d.tile.id === discardTile.id)).toBe(true)
  })
})

describe('human call actions via reduce', () => {
  function callWindowState(overrides: Partial<GameState> = {}): GameState {
    const base = createGame(2)
    const discardTile = tiles('C1')[0]
    return {
      ...base,
      turn: 1,
      phase: 'CALL_WINDOW',
      lastDiscard: { tile: discardTile, seat: 1 },
      discards: [...base.discards, { tile: discardTile, seat: 1 }],
      pendingAiIntents: [],
      humanOptions: null,
      humanCanMahjong: false,
      ...overrides,
    }
  }

  it('rejects CALL_MAHJONG when the human is not actually eligible', () => {
    const g = callWindowState({ humanCanMahjong: false })
    const result = reduce(g, { type: 'CALL_MAHJONG' })
    expect(result).toBe(g) // unchanged
  })

  it('rejects CALL_EXPOSE with a meld that was not offered', () => {
    const offered: Meld = { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') }
    const g = callWindowState({ humanOptions: [{ meld: offered, label: 'Pung of 1 Crak' }] })
    const notOffered: Meld = { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') } // different ids
    const result = reduce(g, { type: 'CALL_EXPOSE', meld: notOffered })
    expect(result).toBe(g) // unchanged
  })

  it('accepts an offered CALL_EXPOSE and hands the turn to the human', () => {
    const offered: Meld = { type: 'pung', kind: 'C1', tiles: tiles('C1', 'C1', 'C1') }
    const g = callWindowState({ humanOptions: [{ meld: offered, label: 'Pung of 1 Crak' }] })
    const result = reduce(g, { type: 'CALL_EXPOSE', meld: offered })
    expect(result.turn).toBe(0)
    expect(result.phase).toBe('PLAY_DISCARD')
    expect(result.players[0].exposures).toHaveLength(1)
  })

  it('lets the human pass, advancing to the next seat', () => {
    const g = callWindowState()
    const result = reduce(g, { type: 'PASS_CALL' })
    expect(result.phase).toBe('PLAY_DRAW')
    expect(result.turn).toBe(nextSeat(1))
  })
})
