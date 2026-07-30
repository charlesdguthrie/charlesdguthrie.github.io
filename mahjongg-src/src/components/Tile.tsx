import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import {
  dragonOf,
  isDragon,
  isFlower,
  isJoker,
  isWind,
  numOf,
  suitOf,
  windOf,
  type TileKind,
} from '../engine/tiles'

// Visual description of a tile face, derived purely from its kind.
interface Face {
  main: string // large glyph / numeral
  sub?: string // small label under it
  cls: string // color class
}

const SUIT_LABEL: Record<string, string> = { B: 'Bam', C: 'Crak', D: 'Dot' }
const SUIT_PIP: Record<string, string> = { B: '🎋', C: '万', D: '●' }
const WIND_LABEL: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }

export function tileFace(kind: TileKind): Face {
  if (isJoker(kind)) return { main: '★', sub: 'Joker', cls: 'tile-joker' }
  if (isFlower(kind)) return { main: '❀', sub: 'Flower', cls: 'tile-flower' }
  if (isWind(kind)) {
    const w = windOf(kind)!
    return { main: w, sub: WIND_LABEL[w], cls: 'tile-wind' }
  }
  if (isDragon(kind)) {
    const d = dragonOf(kind)!
    if (d === 'R') return { main: '中', sub: 'Red', cls: 'tile-dragon-r' }
    if (d === 'G') return { main: '發', sub: 'Green', cls: 'tile-dragon-g' }
    return { main: '◻', sub: 'Soap', cls: 'tile-dragon-w' }
  }
  const s = suitOf(kind)!
  const n = numOf(kind)!
  return { main: String(n), sub: `${SUIT_PIP[s]} ${SUIT_LABEL[s]}`, cls: `tile-suit-${s}` }
}

interface TileProps {
  kind: TileKind
  faceDown?: boolean
  selected?: boolean
  dimmed?: boolean
  small?: boolean
  /** Visually called out (e.g. hovering a hand on the card that this tile counts toward). */
  highlighted?: boolean
  onClick?: () => void
  style?: CSSProperties
  title?: string
  /**
   * Stable tile identity (e.g. the engine's tile id). When provided, it's used
   * to derive a `layoutId` so Framer Motion can animate this exact tile smoothly
   * as it moves between lists (rack → discard pile, Charleston pass, etc.).
   * Optional and purely additive — omitting it just means no cross-list
   * "magic move" animation, everything else still works.
   */
  id?: number | string
  /** Explicit layoutId override; takes precedence over one derived from `id`. */
  layoutId?: string
}

// Tiles animate in/out with a soft scale+fade, and reposition with a gentle
// spring whenever their layout changes (sorting, being removed from a list, etc).
const tileMotionProps = {
  layout: true as const,
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: { type: 'spring' as const, stiffness: 500, damping: 34 },
}

export function Tile({ kind, faceDown, selected, dimmed, small, highlighted, onClick, style, title, id, layoutId }: TileProps) {
  const resolvedLayoutId = layoutId ?? (id !== undefined ? `tile-${id}` : undefined)

  if (faceDown) {
    return (
      <motion.div
        className={`tile tile-back${small ? ' tile-sm' : ''}`}
        style={style}
        aria-hidden
        layoutId={resolvedLayoutId}
        {...tileMotionProps}
      />
    )
  }
  const f = tileFace(kind)
  return (
    <motion.button
      type="button"
      className={`tile ${f.cls}${selected ? ' tile-selected' : ''}${dimmed ? ' tile-dimmed' : ''}${
        small ? ' tile-sm' : ''
      }${onClick ? ' tile-clickable' : ''}${highlighted ? ' tile-highlighted' : ''}`}
      style={style}
      onClick={onClick}
      title={title ?? kind}
      disabled={!onClick}
      layoutId={resolvedLayoutId}
      {...tileMotionProps}
    >
      <span className="tile-main">{f.main}</span>
      {f.sub && <span className="tile-sub">{f.sub}</span>}
    </motion.button>
  )
}
