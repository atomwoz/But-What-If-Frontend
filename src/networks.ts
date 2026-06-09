import { mainnet, sepolia } from 'wagmi/chains'
import type { Address, Hex } from 'viem'

export type ButWhatIfNetwork = {
  chainId: number
  label: string
  address: Address
  explorerBase: string
}

export const butWhatIfNetworks = {
  [mainnet.id]: {
    chainId: mainnet.id,
    label: 'Mainnet',
    address: '0x2B98F183F8fc859da491d50f2A0adEcF3E225612',
    explorerBase: 'https://etherscan.io',
  },
  [sepolia.id]: {
    chainId: sepolia.id,
    label: 'Sepolia',
    address: '0x87678fB91B1A2c8B7E77cc231390397fbfde45b6',
    explorerBase: 'https://sepolia.etherscan.io',
  },
} as const satisfies Record<number, ButWhatIfNetwork>

export const defaultButWhatIfChainId = sepolia.id
export const supportedButWhatIfChains = [sepolia, mainnet] as const

export function getButWhatIfNetwork(chainId: number): ButWhatIfNetwork {
  const network = butWhatIfNetworks[chainId as keyof typeof butWhatIfNetworks]
  if (!network) {
    throw new Error(`Unsupported chain ${chainId}`)
  }
  return network
}

export function getAlternateButWhatIfChainId(chainId: number) {
  return chainId === mainnet.id ? sepolia.id : mainnet.id
}

export function getButWhatIfAddress(chainId: number) {
  return getButWhatIfNetwork(chainId).address
}

export function getButWhatIfAddressUrl(chainId: number) {
  const network = getButWhatIfNetwork(chainId)
  return `${network.explorerBase}/address/${network.address}`
}

export function getButWhatIfTxUrl(chainId: number, txHash: Hex) {
  const network = getButWhatIfNetwork(chainId)
  return `${network.explorerBase}/tx/${txHash}`
}
