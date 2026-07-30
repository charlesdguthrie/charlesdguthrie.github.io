import { describe, it, expect } from 'vitest'
import { groupBySection } from '../cardPanelHelpers'
import { HANDS } from '../../engine/cards'
import type { HandDef } from '../../engine/cards'

const hand = (id: string, section: string): HandDef => ({
  id,
  section,
  points: 25,
  concealed: false,
  desc: `desc for ${id}`,
  suits: { roles: [], distinct: false },
  groups: [],
})

describe('groupBySection', () => {
  it('groups hands sharing a section together', () => {
    const hands = [hand('A', 'Winds & Dragons'), hand('B', '2026'), hand('C', 'Winds & Dragons')]
    const groups = groupBySection(hands)
    expect(groups).toHaveLength(2)
    const wd = groups.find((g) => g.section === 'Winds & Dragons')!
    expect(wd.hands.map((h) => h.id)).toEqual(['A', 'C'])
  })

  it('preserves the order sections first appear in', () => {
    const hands = [hand('A', 'Second'), hand('B', 'First'), hand('C', 'Second')]
    const groups = groupBySection(hands)
    expect(groups.map((g) => g.section)).toEqual(['Second', 'First'])
  })

  it('returns an empty list for no hands', () => {
    expect(groupBySection([])).toEqual([])
  })

  it('covers the full real card without dropping or duplicating any hand', () => {
    const groups = groupBySection(HANDS)
    const total = groups.reduce((sum, g) => sum + g.hands.length, 0)
    expect(total).toBe(HANDS.length)
    const sections = new Set(groups.map((g) => g.section))
    expect(sections.size).toBe(groups.length) // no section repeated
  })
})
