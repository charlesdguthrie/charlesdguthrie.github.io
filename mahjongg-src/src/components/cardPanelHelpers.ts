// Pure data-transformation helpers for the card reference panel.

import type { HandDef } from '../engine/cards'

export interface SectionGroup {
  section: string
  hands: HandDef[]
}

/** Group hands by `section`, preserving the order sections first appear in `hands`. */
export function groupBySection(hands: HandDef[]): SectionGroup[] {
  const order: string[] = []
  const bySection = new Map<string, HandDef[]>()
  for (const h of hands) {
    if (!bySection.has(h.section)) {
      bySection.set(h.section, [])
      order.push(h.section)
    }
    bySection.get(h.section)!.push(h)
  }
  return order.map((section) => ({ section, hands: bySection.get(section)! }))
}
