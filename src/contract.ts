import { decodeEventLog, type Address, type Hex } from 'viem'

export const butWhatIfAbi = [
  {
    type: 'function',
    name: 'whatIf',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'myLuckyNumber', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'YouWon',
    inputs: [
      { name: 'suicider', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'YouLost',
    inputs: [
      { name: 'me', type: 'address', indexed: true },
      { name: 'hardcoreLevel', type: 'uint256', indexed: true },
      { name: 'definitelyNotMyPrivKey', type: 'bytes32', indexed: false },
    ],
  },
] as const

export type ButWhatIfLog = {
  address?: Address
  topics: readonly Hex[]
  data: Hex
}

export type ButWhatIfResult =
  | {
      type: 'won'
      suicider: Address
      amount: bigint
    }
  | {
      type: 'lost'
      me: Address
      hardcoreLevel: bigint
      definitelyNotMyPrivKey: Hex
    }

export function decodeButWhatIfReceipt(logs: readonly ButWhatIfLog[]): ButWhatIfResult | null {
  for (const log of logs) {
    if (log.topics.length === 0) continue

    try {
      const event = decodeEventLog({
        abi: butWhatIfAbi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
      })

      if (event.eventName === 'YouWon') {
        return {
          type: 'won',
          suicider: event.args.suicider,
          amount: event.args.amount,
        }
      }

      if (event.eventName === 'YouLost') {
        return {
          type: 'lost',
          me: event.args.me,
          hardcoreLevel: event.args.hardcoreLevel,
          definitelyNotMyPrivKey: event.args.definitelyNotMyPrivKey,
        }
      }
    } catch {
      // Ignore logs from other contracts or unrelated events in the same receipt.
    }
  }

  return null
}
