# Charlie

A browser-based American Mah Jongg game for one human player against three AI
opponents. It's built like a National Mah Jongg League (NMJL) card — nine
themed sections (a year hand, evens, multiples of 3, odds, a consecutive run,
winds & dragons, any-like-numbers, quints, singles & pairs) — but **the actual
hands and point values are original**. The NMJL's printed card is
copyrighted, and this project deliberately does not transcribe it; every hand
in `src/engine/cards.ts` is an original composition, generated from a small
DSL rather than copied from a real card. If you own a physical card, the DSL
is meant to be trivially edited to match it.

Stack: Vite + React 19 + TypeScript + Zustand + Framer Motion, tested with
Vitest. `src/engine/` is pure, side-effect-free game logic with no framework
dependencies; `src/store.ts` is the sole side-effecting layer (it applies
reducers and schedules AI turns on a timer); `src/App.tsx` and
`src/components/` are the UI.

## Running it

This repo uses the Homebrew npm, not whatever `npm` resolves to on a
corporate machine — the plain `npm` on PATH may be a wrapper that fails auth.

```bash
/opt/homebrew/bin/npm install
/opt/homebrew/bin/npm run dev       # start the dev server
/opt/homebrew/bin/npm test          # run the Vitest suite once
/opt/homebrew/bin/npm run test:watch
/opt/homebrew/bin/npm run build     # tsc -b && vite build
/opt/homebrew/bin/npm run lint      # oxlint
```

## Deploying

This project lives inside the `charlesdguthrie.github.io` repo and is served
at <https://charlieguthrie.com/mahjongg/>. `vite.config.ts` sets
`base: '/mahjongg/'` and builds into the sibling `../mahjongg/` directory,
which is committed to the repo — GitHub Pages serves those files directly, so
there is no CI step:

```bash
/opt/homebrew/bin/npm run build     # regenerates ../mahjongg/
cd .. && git add mahjongg mahjongg-src && git commit && git push
```

`emptyOutDir: true` is required in `vite.config.ts` because the output
directory sits outside the Vite root; without it Vite refuses to clean
`../mahjongg/`. Don't hand-edit anything in `../mahjongg/` — every build
wipes it.

To check the built output before pushing, serve the repo root (not this
directory) so the `/mahjongg/` prefix resolves:

```bash
cd .. && python3 -m http.server 8000   # then open localhost:8000/mahjongg/
```

### Reproducible games

The entire game is deterministic given a seed: the shuffle, deal, and every
AI decision draw randomness from a single seeded RNG (`mulberry32` in
`src/engine/rng.ts`) stored in game state. Open the dev server with a
`?seed=` query param to replay (or share) an exact game:

```
http://localhost:5173/?seed=12345
```

Omit it and a random seed is generated. The current seed is shown in the
in-game log ("New game (seed ...)").

## The hand-definition DSL

All hands live in one array, `HANDS`, in `src/engine/cards.ts`. Each is a
`HandDef`:

```ts
{
  id: 'EVEN-1',
  section: '2468',
  points: 25,
  concealed: false,           // true = no called exposures allowed
  desc: 'Flowers + kongs of 2, 4, 6 in one suit',
  suits: { roles: ['S1'], distinct: false },
  groups: [
    { kind: 'flower', size: 2, jokerOK: false },
    { kind: 'suit', suit: 'S1', num: 2, size: 4, jokerOK: true },
    { kind: 'suit', suit: 'S1', num: 4, size: 4, jokerOK: true },
    { kind: 'suit', suit: 'S1', num: 6, size: 4, jokerOK: true },
  ],
}
```

- **`suits.roles`** is a list of abstract suit variables (`S1`, `S2`, `S3`)
  used by the hand's groups. `suits.distinct` says whether different roles
  must resolve to *different* physical suits (Bam/Crak/Dot) — e.g. "any like
  numbers" needs `distinct: true` across three suits, while a single-suit
  hand only declares `roles: ['S1']`.
- **`groups`** is the list of tile groups that must exactly cover all 14
  tiles. Each group is one of:
  - `{ kind: 'suit', suit, num, size, jokerOK }` — a suited group. `size` is
    `1 | 2 | 3 | 4 | 5` (single/pair/pung/kong/quint).
  - `{ kind: 'wind', which, size, jokerOK }` — `which` is `N | E | S | W`.
  - `{ kind: 'dragon', which, size, jokerOK }` — `which` is a literal color
    (`R | G | W`) or `matchS1`/`matchS2`/`matchS3` to require whichever
    dragon corresponds to that suit role (Bam↔Green, Crak↔Red, Dot↔White).
  - `{ kind: 'flower', size, jokerOK: false }` — jokers can never stand in
    for flowers.
- **`num`** (`NumSpec`) is a literal `1`–`9`, the free variable `'n'`, or an
  offset like `'n+2'`. The matcher enumerates every suit-role assignment and
  every value of `n` that keeps all offsets inside `1..9`, so a hand written
  with `n` (e.g. "kong of n, kong of n+1, kong of n+2") matches for *any*
  valid run, not just one hardcoded number.
- **`jokerOK`** may only be `true` on groups of size ≥ 3 (pungs/kongs/quints)
  — jokers can never fill a pair or single.
- **`sameNumberAcrossSuits`** is a documentation-only flag noting that two or
  more groups share the literal `'n'` (the matcher already ties them to the
  same value); it has no effect on validation or matching.

`validate(HANDS)` (also called automatically at module load) enforces that
every hand's groups sum to exactly 14 tiles, that `jokerOK`/flower rules are
respected, that suit/dragon references point at declared roles, and that at
least one value of `n` keeps every offset inside `1..9`. A bad hand
definition throws immediately on import, so any test run or `npm run dev`
surfaces it right away. To add or edit a hand, add/edit an entry in `HANDS`
and rerun the tests — `src/engine/__tests__/cards.test.ts` and
`match.test.ts` iterate `HANDS` generically, so new hands are covered
automatically (round-trip matching, joker substitution, mutation rejection),
though a few hand-specific tests are worth adding too (see the existing
examples in `match.test.ts`).

The card currently has 32 hands across the 9 sections (up from a 9-hand seed
card, one per section).

## Rules implemented

- Full Charleston: three passes right/across/left, an optional second
  Charleston (also right/across/left), and an optional courtesy pass
  afterward. **Only the human↔across-seat pair exchanges tiles in the
  courtesy pass** — the other pair's courtesy exchange is a rarely-used
  variant rule that's omitted for simplicity (see the comment in
  `reduce`'s `COURTESY_PASS` case in `src/engine/state.ts`).
- Draw / discard / call-window turn flow, with call priority: Mah Jongg beats
  an exposure claim, and ties between exposure claims are broken by nearest
  seat counterclockwise from the discarder (`resolveCallWindow`).
- Jokers can substitute in any exposed or concealed pung/kong/quint whose
  group allows it (`jokerOK`), but never in a pair, a single, a flower group,
  or a Charleston/courtesy pass.
- Concealed-only hands (`concealed: true`) become ineligible the moment a
  player has any exposure.
- A seeded RNG drives the shuffle, deal, and every AI decision, so a whole
  game is reproducible from its seed (see `?seed=` above).
- AI opponents are pure functions of public information only (their own
  tiles plus discards/exposures) — they never inspect the wall or other
  players' concealed hands. See `src/engine/ai.ts` and `src/engine/calls.ts`.

## Rules deliberately omitted or simplified

- **Only one pair's courtesy pass** (human↔across) — the discarder-side
  pair's courtesy exchange isn't implemented.
- **No joker swap/redemption.** A real NMJL game lets any player swap a
  natural tile for a joker sitting in an opponent's exposed meld (if they
  can produce the natural and the group would still be valid). This game
  has no such mechanic — once a meld is exposed, its tiles are locked.
- **Single-hand games only.** There's no East-retains-dealer streak, no
  scoring ledger across multiple hands, and no wind-round progression —
  each game is exactly one hand, ending in a win or a wall game (the pile
  runs out with no Mah Jongg).
- **No charleston "blind pass" / stealing a passed tile back**, and no
  wall-tile "loading the wall for the dead hand" variants some house rules
  use.
- The hand set is original, not the real NMJL card (see the top of this
  file and the copyright note in `src/engine/cards.ts`).

## AI difficulty notes

`DIFFICULTY` in `src/engine/ai.ts` currently has one knob,
`targetHysteresis`: when ranking which hand to pursue, the AI considers all
candidate hands within `targetHysteresis` tiles of the closest one and
prefers whichever needs the fewest tiles that can *only* ever be completed
by drawing an exact natural (i.e. groups where `jokerOK` is false, such as
bare pairs/singles) — those are far more likely to strand a player once the
wall thins out than a group that could also be filled by a joker draw or a
called meld. This is used by `chooseTarget`, `chooseDiscard`, and
`chooseCharlestonPass` alike. Tuned against the 40-seed full-game simulation
in `state.test.ts`'s `playOut()` harness, this raised the win rate from 20/40
(50% wall games) to 31/40 (77.5% wins) on the expanded 32-hand card, without
touching `calls.test.ts`'s or `state.test.ts`'s hardcoded AI-decision
expectations.

## Manual playtest checklist

- [ ] Play through the first Charleston (all three passes: right, across, left).
- [ ] Accept the second Charleston and play through it too.
- [ ] Try both a 3-tile and a 0-tile courtesy pass.
- [ ] Get an AI opponent to call and expose a meld off your discard.
- [ ] Win by self-draw (declare Mah Jongg on your own turn).
- [ ] Win by calling another player's discard.
- [ ] Let an AI opponent win.
- [ ] Play a game out to a wall game (no winner) — or use a `?seed=` known
      to end that way while testing.
- [ ] Get a joker into one of your exposed melds (call a discard using a
      joker from your hand, or expose a meld that already contains one).
