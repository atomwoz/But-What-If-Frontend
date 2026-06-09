import { describe, expect, it } from 'vitest'

import { getGunOpacity, getNextPhaseAfterInput } from './duelFlow'

describe('duel flow', () => {
  it('keeps the gun faint before a valid lucky number is entered', () => {
    expect(getGunOpacity('')).toBe(0.25)
    expect(getNextPhaseAfterInput('', 'idle')).toBe('idle')
  })

  it('arms the gun by increasing opacity after a valid lucky number is entered', () => {
    expect(getGunOpacity('13')).toBe(1)
    expect(getNextPhaseAfterInput('13', 'idle')).toBe('armed')
  })
})
