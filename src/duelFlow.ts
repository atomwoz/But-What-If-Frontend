export type DuelPhase = 'idle' | 'armed' | 'shooting' | 'pending' | 'won' | 'lost' | 'error'

export function isValidLuckyNumber(value: string) {
  return /^(0|[1-9]\d*)$/.test(value.trim())
}

export function getGunOpacity(luckyNumber: string) {
  return isValidLuckyNumber(luckyNumber) ? 1 : 0.25
}

export function getNextPhaseAfterInput(luckyNumber: string, currentPhase: DuelPhase): DuelPhase {
  if (currentPhase === 'pending' || currentPhase === 'shooting') {
    return currentPhase
  }

  return isValidLuckyNumber(luckyNumber) ? 'armed' : 'idle'
}
