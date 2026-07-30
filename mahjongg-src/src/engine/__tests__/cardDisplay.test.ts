import { describe, it, expect } from 'vitest'
import { HANDS } from '../cards'
import { HAND_DISPLAY } from '../cardDisplay'

describe('HAND_DISPLAY', () => {
  it('has a display entry for every hand definition', () => {
    for (const def of HANDS) {
      expect(HAND_DISPLAY[def.id], def.id).toBeDefined()
    }
  })

  it('has no stale entries for hand ids that no longer exist', () => {
    const ids = new Set(HANDS.map((h) => h.id))
    for (const id of Object.keys(HAND_DISPLAY)) {
      expect(ids.has(id), id).toBe(true)
    }
  })
})
