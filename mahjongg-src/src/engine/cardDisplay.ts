// Generated from ~/work/obsidian-vault/10-Projects/mahjongg-simulator/hands.json.
// Literal source-card display data per hand: the exact printed pattern text,
// short requirement phrase, and per-token ink color (green/red/black — the
// source card's own same-suit/different-suit/neutral convention, independent of
// which real suit the matcher happens to resolve). Keyed by HandDef.id; kept as
// a separate module (rather than folded into cards.ts) so the matching engine
// stays untouched by presentation-only data. See MahjongCard.tsx for usage.

export type CardInkColor = 'green' | 'red' | 'black'

export interface DisplayGroup {
  text: string
  color: CardInkColor
}

export interface HandDisplay {
  patternText: string
  /** Short requirement phrase, e.g. "Any 2 Suits" — empty when the card prints none. */
  requirement: string
  groups: DisplayGroup[]
}

export const HAND_DISPLAY: Record<string, HandDisplay> = {
  'LIKE-1': {
    patternText: '1111 FFFFFF 1111',
    requirement: 'Any 2 Suits',
    groups: [{ text: '1111', color: 'green' }, { text: 'FFFFFF', color: 'black' }, { text: '1111', color: 'red' }],
  },
  'LIKE-2': {
    patternText: '1111 D 111 D 1111 D',
    requirement: 'Any 3 Suits w Matching Dragon',
    groups: [{ text: '1111', color: 'green' }, { text: 'D', color: 'green' }, { text: '111', color: 'red' }, { text: 'D', color: 'red' }, { text: '1111', color: 'black' }, { text: 'D', color: 'black' }],
  },
  'LIKE-3': {
    patternText: 'FF 1111 11 1111 DD',
    requirement: 'Any 3 Suits w Any Dragon',
    groups: [{ text: 'FF', color: 'black' }, { text: '1111', color: 'green' }, { text: '11', color: 'red' }, { text: '1111', color: 'black' }, { text: 'DD', color: 'green' }],
  },
  'QUINT-1': {
    patternText: '11111 1111 11111',
    requirement: 'Any 3 Suits, Any Like Nos',
    groups: [{ text: '11111', color: 'green' }, { text: '1111', color: 'red' }, { text: '11111', color: 'black' }],
  },
  'QUINT-2': {
    patternText: 'FF 11111 22 33333',
    requirement: 'Any 1 Suit, Any 3 Consecutive Nos',
    groups: [{ text: 'FF', color: 'black' }, { text: '11111', color: 'black' }, { text: '22', color: 'black' }, { text: '33333', color: 'black' }],
  },
  'QUINT-3': {
    patternText: '11111 44444 DDDD',
    requirement: 'Any 2 Nos. in Any 1 Suit w Opp. Dragon',
    groups: [{ text: '11111', color: 'green' }, { text: '44444', color: 'green' }, { text: 'DDDD', color: 'red' }],
  },
  'RUN-1': {
    patternText: '11 222 33 444 5555',
    requirement: 'Any 1 Suit, These Numbers Only',
    groups: [{ text: '11', color: 'black' }, { text: '222', color: 'black' }, { text: '33', color: 'black' }, { text: '444', color: 'black' }, { text: '5555', color: 'black' }],
  },
  'RUN-2': {
    patternText: '55 666 77 888 9999',
    requirement: 'Any 1 Suit, These Numbers Only',
    groups: [{ text: '55', color: 'black' }, { text: '666', color: 'black' }, { text: '77', color: 'black' }, { text: '888', color: 'black' }, { text: '9999', color: 'black' }],
  },
  'RUN-3': {
    patternText: 'FFF 1111 234 5555',
    requirement: 'Any 1 Suit, Any 5 Consecutive Numbers',
    groups: [{ text: 'FFF', color: 'black' }, { text: '1111', color: 'black' }, { text: '234', color: 'black' }, { text: '5555', color: 'black' }],
  },
  'RUN-4': {
    patternText: 'FFF 1111 234 5555',
    requirement: 'Any 2 Suits, Any 5 Consecutive Numbers',
    groups: [{ text: 'FFF', color: 'black' }, { text: '1111', color: 'green' }, { text: '234', color: 'red' }, { text: '5555', color: 'green' }],
  },
  'RUN-5': {
    patternText: '11 22 111 222 3333',
    requirement: 'Any 3 Suits, Any 3 Consecutive Numbers',
    groups: [{ text: '11', color: 'green' }, { text: '22', color: 'green' }, { text: '111', color: 'red' }, { text: '222', color: 'red' }, { text: '3333', color: 'black' }],
  },
  'RUN-6': {
    patternText: '111 222 3333 4444',
    requirement: 'Any 1 Suit, Any 4 Consecutive Numbers',
    groups: [{ text: '111', color: 'black' }, { text: '222', color: 'black' }, { text: '3333', color: 'black' }, { text: '4444', color: 'black' }],
  },
  'RUN-7': {
    patternText: '111 222 3333 4444',
    requirement: 'Any 2 Suits, Any 4 Consecutive Numbers',
    groups: [{ text: '111', color: 'green' }, { text: '222', color: 'green' }, { text: '3333', color: 'red' }, { text: '4444', color: 'red' }],
  },
  'RUN-8': {
    patternText: 'FFF 11 22 333 DDDD',
    requirement: '1 Suit, Any Run, Dragons Match Middle No',
    groups: [{ text: 'FFF', color: 'black' }, { text: '11', color: 'black' }, { text: '22', color: 'black' }, { text: '333', color: 'black' }, { text: 'DDDD', color: 'black' }],
  },
  'RUN-9': {
    patternText: 'FFF 11 22 333 DDDD',
    requirement: '2 Suits, Any Run, Dragons Match Middle No',
    groups: [{ text: 'FFF', color: 'black' }, { text: '11', color: 'green' }, { text: '22', color: 'red' }, { text: '333', color: 'green' }, { text: 'DDDD', color: 'red' }],
  },
  'RUN-10': {
    patternText: '1111 FFFFFF 2222',
    requirement: 'Any 1 Suit, Any 2 Consecutive Numbers',
    groups: [{ text: '1111', color: 'black' }, { text: 'FFFFFF', color: 'black' }, { text: '2222', color: 'black' }],
  },
  'RUN-11': {
    patternText: 'FF 1111 2222 3333',
    requirement: 'Any 1 Suit, Any 3 Consecutive Numbers',
    groups: [{ text: 'FF', color: 'black' }, { text: '1111', color: 'black' }, { text: '2222', color: 'black' }, { text: '3333', color: 'black' }],
  },
  'RUN-12': {
    patternText: 'FF 1111 2222 3333',
    requirement: 'Any 3 Suits, Any 3 Consecutive Numbers',
    groups: [{ text: 'FF', color: 'black' }, { text: '1111', color: 'green' }, { text: '2222', color: 'red' }, { text: '3333', color: 'black' }],
  },
  'RUN-13': {
    patternText: '1 22 333 1 22 333 44',
    requirement: 'Any 3 Suits, Any 4 Consecutive Numbers',
    groups: [{ text: '1', color: 'green' }, { text: '22', color: 'black' }, { text: '333', color: 'black' }, { text: '1', color: 'black' }, { text: '22', color: 'black' }, { text: '333', color: 'black' }, { text: '44', color: 'red' }],
  },
  'ODD-1': {
    patternText: '11 333 55 777 9999',
    requirement: 'Any 1 Suit',
    groups: [{ text: '11', color: 'black' }, { text: '333', color: 'black' }, { text: '55', color: 'black' }, { text: '777', color: 'black' }, { text: '9999', color: 'black' }],
  },
  'ODD-2': {
    patternText: '11 333 55 777 9999',
    requirement: 'Any 3 Suits',
    groups: [{ text: '11', color: 'green' }, { text: '333', color: 'black' }, { text: '55', color: 'red' }, { text: '777', color: 'black' }, { text: '9999', color: 'black' }],
  },
  'ODD-3': {
    patternText: '111 333 3333 5555',
    requirement: 'Any 2 Suits',
    groups: [{ text: '111', color: 'green' }, { text: '333', color: 'green' }, { text: '3333', color: 'red' }, { text: '5555', color: 'red' }],
  },
  'ODD-4': {
    patternText: '555 777 7777 9999',
    requirement: 'Any 2 Suits',
    groups: [{ text: '555', color: 'green' }, { text: '777', color: 'green' }, { text: '7777', color: 'red' }, { text: '9999', color: 'red' }],
  },
  'ODD-5': {
    patternText: 'NN 1111 33 5555 SS',
    requirement: 'Any 1 Suit, North and South Only',
    groups: [{ text: 'NN', color: 'black' }, { text: '1111', color: 'black' }, { text: '33', color: 'black' }, { text: '5555', color: 'black' }, { text: 'SS', color: 'black' }],
  },
  'ODD-6': {
    patternText: 'NN 5555 77 9999 SS',
    requirement: 'Any 1 Suit, North and South Only',
    groups: [{ text: 'NN', color: 'black' }, { text: '5555', color: 'black' }, { text: '77', color: 'black' }, { text: '9999', color: 'black' }, { text: 'SS', color: 'black' }],
  },
  'ODD-7': {
    patternText: '113579 1111 1111',
    requirement: 'Any 3 Suits, Pair Any Odd No., Kongs Match Pair',
    groups: [{ text: '113579', color: 'green' }, { text: '1111', color: 'red' }, { text: '1111', color: 'black' }],
  },
  'ODD-8': {
    patternText: 'FFF 11 33 555 DDDD',
    requirement: 'Any 1 Suit w Matching Dragon',
    groups: [{ text: 'FFF', color: 'black' }, { text: '11', color: 'black' }, { text: '33', color: 'black' }, { text: '555', color: 'black' }, { text: 'DDDD', color: 'black' }],
  },
  'ODD-9': {
    patternText: 'FFF 55 77 999 DDDD',
    requirement: 'Any 1 Suit w Matching Dragon',
    groups: [{ text: 'FFF', color: 'black' }, { text: '55', color: 'black' }, { text: '77', color: 'black' }, { text: '999', color: 'black' }, { text: 'DDDD', color: 'black' }],
  },
  'ODD-10': {
    patternText: '11 33 111 333 5555',
    requirement: 'Any 3 Suits',
    groups: [{ text: '11', color: 'green' }, { text: '33', color: 'green' }, { text: '111', color: 'red' }, { text: '333', color: 'red' }, { text: '5555', color: 'black' }],
  },
  'ODD-11': {
    patternText: '55 77 555 777 9999',
    requirement: 'Any 3 Suits',
    groups: [{ text: '55', color: 'green' }, { text: '77', color: 'green' }, { text: '555', color: 'green' }, { text: '777', color: 'red' }, { text: '9999', color: 'black' }],
  },
  'ODD-12': {
    patternText: '1111 33 55 77 9999',
    requirement: 'Any 1 Suit',
    groups: [{ text: '1111', color: 'black' }, { text: '33', color: 'black' }, { text: '55', color: 'black' }, { text: '77', color: 'black' }, { text: '9999', color: 'black' }],
  },
  'ODD-13': {
    patternText: '1111 33 55 77 9999',
    requirement: 'Any 2 Suits',
    groups: [{ text: '1111', color: 'black' }, { text: '33', color: 'black' }, { text: '55', color: 'black' }, { text: '77', color: 'black' }, { text: '9999', color: 'green' }],
  },
  'ODD-14': {
    patternText: 'FF 11 33 55 111 111',
    requirement: 'Any 3 Suits. These Numbers Only',
    groups: [{ text: 'FF', color: 'black' }, { text: '11', color: 'green' }, { text: '33', color: 'green' }, { text: '55', color: 'green' }, { text: '111', color: 'red' }, { text: '111', color: 'black' }],
  },
  'ODD-15': {
    patternText: 'FF 55 77 99 555 555',
    requirement: 'Any 3 Suits. These Numbers Only',
    groups: [{ text: 'FF', color: 'black' }, { text: '55', color: 'green' }, { text: '77', color: 'green' }, { text: '99', color: 'green' }, { text: '555', color: 'red' }, { text: '555', color: 'black' }],
  },
  'ODD-16': {
    patternText: 'FF 135 777 999 DDD',
    requirement: 'Any 1 Suit w Opp. Dragon',
    groups: [{ text: 'FF', color: 'black' }, { text: '135', color: 'green' }, { text: '777', color: 'green' }, { text: '999', color: 'green' }, { text: 'DDD', color: 'red' }],
  },
  'WD-1': {
    patternText: 'NNNN EEE WWW SSSS',
    requirement: '',
    groups: [{ text: 'NNNN', color: 'black' }, { text: 'EEE', color: 'black' }, { text: 'WWW', color: 'black' }, { text: 'SSSS', color: 'black' }],
  },
  'WD-2': {
    patternText: 'NNN EEEE WWWW SSS',
    requirement: '',
    groups: [{ text: 'NNN', color: 'black' }, { text: 'EEEE', color: 'black' }, { text: 'WWWW', color: 'black' }, { text: 'SSS', color: 'black' }],
  },
  'WD-3': {
    patternText: '1234 DDD DDD DDDD',
    requirement: 'Any 4 Consecutive Numbers in Any 1 Suit, Any 3 Dragons',
    groups: [{ text: '1234', color: 'black' }, { text: 'DDD', color: 'green' }, { text: 'DDD', color: 'red' }, { text: 'DDDD', color: 'black' }],
  },
  'WD-4': {
    patternText: 'NNN 1111 1111 SSS',
    requirement: 'Any Like Odd Numbers in Any 2 Suits',
    groups: [{ text: 'NNN', color: 'black' }, { text: '1111', color: 'green' }, { text: '1111', color: 'red' }, { text: 'SSS', color: 'black' }],
  },
  'WD-5': {
    patternText: 'EEE 2222 2222 WWW',
    requirement: 'Any Like Even Numbers in Any 2 Suits',
    groups: [{ text: 'EEE', color: 'black' }, { text: '2222', color: 'green' }, { text: '2222', color: 'red' }, { text: 'WWW', color: 'black' }],
  },
  'WD-6': {
    patternText: 'FFF NNNN FFF DDDD',
    requirement: 'Any Wind, Any Dragon',
    groups: [{ text: 'FFF', color: 'black' }, { text: 'NNNN', color: 'black' }, { text: 'FFF', color: 'black' }, { text: 'DDDD', color: 'black' }],
  },
  'WD-7': {
    patternText: '1 N 2 EE 3 WWW 4 SSSS',
    requirement: 'Any 1 Suit, These Numbers Only',
    groups: [{ text: '1', color: 'black' }, { text: 'N', color: 'black' }, { text: '2', color: 'black' }, { text: 'EE', color: 'black' }, { text: '3', color: 'black' }, { text: 'WWW', color: 'black' }, { text: '4', color: 'black' }, { text: 'SSSS', color: 'black' }],
  },
  'WD-8': {
    patternText: 'FF NNNN SSSS DD DD',
    requirement: 'Any 2 Dragons',
    groups: [{ text: 'FF', color: 'black' }, { text: 'NNNN', color: 'black' }, { text: 'SSSS', color: 'black' }, { text: 'DD', color: 'green' }, { text: 'DD', color: 'red' }],
  },
  'WD-9': {
    patternText: 'FF EEEE WWWW DD DD',
    requirement: 'Any 2 Dragons',
    groups: [{ text: 'FF', color: 'black' }, { text: 'EEEE', color: 'black' }, { text: 'WWWW', color: 'black' }, { text: 'DD', color: 'green' }, { text: 'DD', color: 'red' }],
  },
  'WD-10': {
    patternText: 'NN EEE 2026 WWW SS',
    requirement: '2026 Any 1 Suit',
    groups: [{ text: 'NN', color: 'black' }, { text: 'EEE', color: 'black' }, { text: '2026', color: 'black' }, { text: 'WWW', color: 'black' }, { text: 'SS', color: 'black' }],
  },
  'MUL3-1': {
    patternText: '333 666 6666 9999',
    requirement: 'Any 2 Suits',
    groups: [{ text: '333', color: 'green' }, { text: '666', color: 'green' }, { text: '6666', color: 'red' }, { text: '9999', color: 'red' }],
  },
  'MUL3-2': {
    patternText: '333 666 6666 9999',
    requirement: 'Any 3 Suits',
    groups: [{ text: '333', color: 'green' }, { text: '666', color: 'green' }, { text: '6666', color: 'red' }, { text: '9999', color: 'black' }],
  },
  'MUL3-3': {
    patternText: '33 66 333 666 9999',
    requirement: 'Any 3 Suits',
    groups: [{ text: '33', color: 'green' }, { text: '66', color: 'green' }, { text: '333', color: 'red' }, { text: '666', color: 'red' }, { text: '9999', color: 'black' }],
  },
  'MUL3-4': {
    patternText: 'FFF 33 666 99 DDDD',
    requirement: '1 Suit w Matching Dragon',
    groups: [{ text: 'FFF', color: 'black' }, { text: '33', color: 'black' }, { text: '666', color: 'black' }, { text: '99', color: 'green' }, { text: 'DDDD', color: 'green' }],
  },
  'MUL3-5': {
    patternText: 'FFF 33 666 99 DDDD',
    requirement: '1 Suit w Opp. Dragon',
    groups: [{ text: 'FFF', color: 'black' }, { text: '33', color: 'green' }, { text: '666', color: 'green' }, { text: '99', color: 'green' }, { text: 'DDDD', color: 'red' }],
  },
  'MUL3-6': {
    patternText: '33 66 666 999 NEWS',
    requirement: 'Any 2 Suits',
    groups: [{ text: '33', color: 'green' }, { text: '66', color: 'green' }, { text: '666', color: 'red' }, { text: '999', color: 'red' }, { text: 'NEWS', color: 'black' }],
  },
  'MUL3-7': {
    patternText: 'FF 3369 3333 3333',
    requirement: 'Any 3 Suits, Pair 3, 6, or 9, Kongs Match Pair',
    groups: [{ text: 'FF', color: 'black' }, { text: '3369', color: 'green' }, { text: '3333', color: 'red' }, { text: '3333', color: 'black' }],
  },
  'MUL3-8': {
    patternText: 'FF 333 666 999 369',
    requirement: 'Any 2 Suits',
    groups: [{ text: 'FF', color: 'black' }, { text: '333', color: 'green' }, { text: '666', color: 'green' }, { text: '999', color: 'red' }, { text: '369', color: 'red' }],
  },
  'SP-1': {
    patternText: 'NN EE WW SS 1D 1D 1D',
    requirement: 'Any 3 Suits, Any',
    groups: [{ text: 'NN', color: 'black' }, { text: 'EE', color: 'black' }, { text: 'WW', color: 'black' }, { text: 'SS', color: 'black' }, { text: '1D', color: 'green' }, { text: '1D', color: 'red' }, { text: '1D', color: 'black' }],
  },
  'SP-2': {
    patternText: '2 4 66 88 2 4 66 88 88',
    requirement: 'Any 3 Suits, These Numbers Only',
    groups: [{ text: '2', color: 'green' }, { text: '4', color: 'green' }, { text: '66', color: 'green' }, { text: '88', color: 'green' }, { text: '2', color: 'black' }, { text: '4', color: 'black' }, { text: '66', color: 'black' }, { text: '88', color: 'black' }, { text: '88', color: 'red' }],
  },
  'SP-3': {
    patternText: 'FF 3369 3669 3699',
    requirement: 'Any 3 Suits',
    groups: [{ text: 'FF', color: 'black' }, { text: '3369', color: 'green' }, { text: '3669', color: 'red' }, { text: '3699', color: 'black' }],
  },
  'SP-4': {
    patternText: '11 22 33 44 55 66 77',
    requirement: 'Any 1 Suit, Any 7 Consecutive Nos',
    groups: [{ text: '11', color: 'black' }, { text: '22', color: 'black' }, { text: '33', color: 'black' }, { text: '44', color: 'black' }, { text: '55', color: 'black' }, { text: '66', color: 'black' }, { text: '77', color: 'black' }],
  },
  'SP-5': {
    patternText: '11 357 99 11 357 99',
    requirement: 'Any 2 Suits',
    groups: [{ text: '11', color: 'green' }, { text: '357', color: 'green' }, { text: '99', color: 'black' }, { text: '11', color: 'black' }, { text: '357', color: 'black' }, { text: '99', color: 'red' }],
  },
  'SP-6': {
    patternText: 'FF 2026 2026 2026',
    requirement: 'Any 3 Suits',
    groups: [{ text: 'FF', color: 'black' }, { text: '2026', color: 'green' }, { text: '2026', color: 'black' }, { text: '2026', color: 'red' }],
  },
  'YEAR-1': {
    patternText: '222 000 2222 6666',
    requirement: 'Any 2 Suits',
    groups: [{ text: '222', color: 'green' }, { text: '000', color: 'black' }, { text: '2222', color: 'red' }, { text: '6666', color: 'red' }],
  },
  'YEAR-2': {
    patternText: '2026 DDD 2222 DDD',
    requirement: 'Any 2 suits w matching Dragons, Kong 2 or 6',
    groups: [{ text: '2026', color: 'green' }, { text: 'DDD', color: 'green' }, { text: '2222', color: 'red' }, { text: 'DDD', color: 'red' }],
  },
  'YEAR-3': {
    patternText: 'FFF 2026 222 6666',
    requirement: 'Any 3 Suits',
    groups: [{ text: 'FFF', color: 'black' }, { text: '2026', color: 'green' }, { text: '222', color: 'red' }, { text: '6666', color: 'black' }],
  },
  'YEAR-4': {
    patternText: '22 00 222 666 NEWS',
    requirement: 'Any 2 Suits',
    groups: [{ text: '22', color: 'green' }, { text: '00', color: 'black' }, { text: '222', color: 'red' }, { text: '666', color: 'red' }, { text: 'NEWS', color: 'black' }],
  },
  'EVEN-1': {
    patternText: '222 444 6666 8888',
    requirement: 'Any 1 Suit',
    groups: [{ text: '222', color: 'black' }, { text: '444', color: 'black' }, { text: '6666', color: 'black' }, { text: '8888', color: 'black' }],
  },
  'EVEN-2': {
    patternText: '222 444 6666 8888',
    requirement: 'Any 2 suits',
    groups: [{ text: '222', color: 'green' }, { text: '444', color: 'green' }, { text: '6666', color: 'red' }, { text: '8888', color: 'red' }],
  },
  'EVEN-3': {
    patternText: 'FF 2222 44 66 8888',
    requirement: 'Any 2 Suits',
    groups: [{ text: 'FF', color: 'black' }, { text: '2222', color: 'green' }, { text: '44', color: 'red' }, { text: '66', color: 'black' }, { text: '8888', color: 'green' }],
  },
  'EVEN-4': {
    patternText: 'EE 22 444 666 88 WW',
    requirement: 'Any 1 Suit, East and West Only',
    groups: [{ text: 'EE', color: 'black' }, { text: '22', color: 'black' }, { text: '444', color: 'black' }, { text: '666', color: 'black' }, { text: '88', color: 'black' }, { text: 'WW', color: 'black' }],
  },
  'EVEN-5': {
    patternText: '2222 DDD 8888 DDD',
    requirement: 'Any 2 Suits w Matching Dragons, These Nos. Only',
    groups: [{ text: '2222', color: 'green' }, { text: 'DDD', color: 'green' }, { text: '8888', color: 'red' }, { text: 'DDD', color: 'red' }],
  },
  'EVEN-6': {
    patternText: 'FFF 22 44 666 8888',
    requirement: 'Any 1 Suit',
    groups: [{ text: 'FFF', color: 'black' }, { text: '22', color: 'black' }, { text: '44', color: 'black' }, { text: '666', color: 'black' }, { text: '8888', color: 'black' }],
  },
  'EVEN-7': {
    patternText: '2468 2222 D 2222 D',
    requirement: 'Any 3 Suits, Like Kongs, 2, 4, 6, or 8 w Matching Dragons',
    groups: [{ text: '2468', color: 'green' }, { text: '2222', color: 'red' }, { text: 'D', color: 'red' }, { text: '2222', color: 'black' }, { text: 'D', color: 'black' }],
  },
  'EVEN-8': {
    patternText: 'FFF 2468 FFF 2222',
    requirement: 'Any 2 Suits, Kongs, 2, 4, 6, or 8',
    groups: [{ text: 'FFF', color: 'black' }, { text: '2468', color: 'green' }, { text: 'FFF', color: 'black' }, { text: '2222', color: 'red' }],
  },
  'EVEN-9': {
    patternText: 'FF 246 888 246 888',
    requirement: 'Any 2 Suits',
    groups: [{ text: 'FF', color: 'black' }, { text: '246', color: 'green' }, { text: '888', color: 'green' }, { text: '246', color: 'red' }, { text: '888', color: 'red' }],
  },
}
