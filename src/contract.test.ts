import { encodeEventTopics, encodeAbiParameters, parseAbiParameters } from 'viem'
import { describe, expect, it } from 'vitest'

import { butWhatIfAbi, decodeButWhatIfReceipt } from './contract'
import { defaultButWhatIfChainId, getButWhatIfAddress } from './networks'

const contractAddress = getButWhatIfAddress(defaultButWhatIfChainId)
const user = '0x000000000000000000000000000000000000bEEF'

describe('contract receipt decoding', () => {
  it('decodes a YouLost event from transaction logs', () => {
    const digest = `0x${'12'.repeat(32)}` as const
    const [topic0, topic1, topic2] = encodeEventTopics({
      abi: butWhatIfAbi,
      eventName: 'YouLost',
      args: {
        me: user,
        hardcoreLevel: 123n,
      },
    })

    const result = decodeButWhatIfReceipt([
      {
        address: contractAddress,
        topics: [topic0, topic1, topic2],
        data: encodeAbiParameters(parseAbiParameters('bytes32'), [digest]),
      },
    ])

    expect(result).toEqual({
      type: 'lost',
      me: user,
      hardcoreLevel: 123n,
      definitelyNotMyPrivKey: digest,
    })
  })

  it('decodes a YouWon event from transaction logs', () => {
    const [topic0, topic1, topic2] = encodeEventTopics({
      abi: butWhatIfAbi,
      eventName: 'YouWon',
      args: {
        suicider: user,
        amount: 1_000_000_000_000_000_000n,
      },
    })

    const result = decodeButWhatIfReceipt([
      {
        address: contractAddress,
        topics: [topic0, topic1, topic2],
        data: '0x',
      },
    ])

    expect(result).toEqual({
      type: 'won',
      suicider: user,
      amount: 1_000_000_000_000_000_000n,
    })
  })
})
