// Browsable reference panel listing every hand on the card, grouped by section,
// with the hands the player is currently closest to called out.

import { useMemo } from 'react'
import type { HandDef } from '../engine/cards'
import type { Closeness } from '../engine/match'
import { groupBySection } from './cardPanelHelpers'

interface CardPanelProps {
  hands: HandDef[]
  /** Current closeness ranking, if available — used to badge/highlight nearby hands. */
  ranked?: Closeness[]
}

export function CardPanel({ hands, ranked }: CardPanelProps) {
  const groups = useMemo(() => groupBySection(hands), [hands])
  const closestIds = useMemo(() => new Set((ranked ?? []).map((c) => c.def.id)), [ranked])

  return (
    <div className="card-panel">
      <div className="card-panel-title">The Card</div>
      <div className="card-panel-sections">
        {groups.map((g) => {
          const hasClose = g.hands.some((h) => closestIds.has(h.id))
          return (
            <details key={g.section} className="card-section" open={hasClose}>
              <summary className="card-section-summary">
                {g.section}
                {hasClose && <span className="card-section-badge">close</span>}
              </summary>
              <ul className="card-hand-list">
                {g.hands.map((h) => (
                  <li key={h.id} className={`card-hand${closestIds.has(h.id) ? ' card-hand-close' : ''}`}>
                    <div className="card-hand-head">
                      <span className="card-hand-points">{h.points} pts</span>
                      {closestIds.has(h.id) && <span className="card-hand-badge">Close</span>}
                      {h.concealed && <span className="card-hand-concealed">Concealed</span>}
                    </div>
                    <div className="card-hand-desc">{h.desc}</div>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}
