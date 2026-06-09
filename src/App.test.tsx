import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PureDuelApp } from './App'
import type { ButWhatIfResult } from './contract'
import { defaultButWhatIfChainId, getButWhatIfAddressUrl, getButWhatIfNetwork } from './networks'

describe('PureDuelApp', () => {
  const defaultNetwork = getButWhatIfNetwork(defaultButWhatIfChainId)

  const defaultProps = {
    accountAddress: undefined,
    connectLabel: 'Connect wallet',
    contractAddressUrl: getButWhatIfAddressUrl(defaultButWhatIfChainId),
    isConnected: false,
    isConnecting: false,
    isAwaitingSignature: false,
    isPending: false,
    isSwitchingNetwork: false,
    networkLabel: defaultNetwork.label,
    nextNetworkLabel: 'Mainnet',
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onPullTrigger: vi.fn(),
    onToggleNetwork: vi.fn(),
    onTryAgain: vi.fn(),
    txHash: undefined,
    result: null,
    errorMessage: undefined,
    getExplorerUrl: () => undefined,
  }

  it('raises the revolver opacity to 1 after a lucky number is entered', async () => {
    render(<PureDuelApp {...defaultProps} />)

    const revolver = screen.getByTestId('revolver-stage')
    expect(revolver).toHaveStyle({ opacity: '0.25' })

    await userEvent.type(screen.getByLabelText(/lucky number/i), '13')

    expect(revolver).toHaveStyle({ opacity: '1' })
  })

  it('enables the trigger after a lucky number even before the wallet is connected', async () => {
    const onConnect = vi.fn()
    render(<PureDuelApp {...defaultProps} onConnect={onConnect} />)

    await userEvent.type(screen.getByLabelText(/lucky number/i), '13')
    await userEvent.click(screen.getByRole('button', { name: /pull trigger/i }))

    expect(onConnect).toHaveBeenCalledOnce()
  })

  it('shows the slot machine paused on the first frame before the trigger is pulled', () => {
    render(<PureDuelApp {...defaultProps} />)

    expect(screen.getByTestId('slot-video')).toHaveAttribute('data-looping', 'false')
    expect(screen.queryByTestId('revolver-video')).not.toBeInTheDocument()
  })

  it('shows the slot machine loop immediately when asking the wallet to sign', async () => {
    const onPullTrigger = vi.fn()

    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        onPullTrigger={onPullTrigger}
      />,
    )

    await userEvent.type(screen.getByLabelText(/lucky number/i), '13')
    await userEvent.click(screen.getByRole('button', { name: /pull trigger/i }))

    expect(onPullTrigger).toHaveBeenCalledWith('13')
    expect(screen.getByTestId('slot-video')).toHaveAttribute('data-looping', 'true')
    expect(screen.queryByTestId('revolver-video')).not.toBeInTheDocument()
  })

  it('returns to the pull trigger action if the wallet signing fails', async () => {
    const onPullTrigger = vi.fn()
    const { rerender } = render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        onPullTrigger={onPullTrigger}
      />,
    )

    await userEvent.type(screen.getByLabelText(/lucky number/i), '13')
    await userEvent.click(screen.getByRole('button', { name: /pull trigger/i }))

    expect(screen.getByRole('button', { name: /sign the shot/i })).toBeInTheDocument()

    rerender(
      <PureDuelApp
        {...defaultProps}
        isConnected
        errorMessage="User rejected the request."
        onPullTrigger={onPullTrigger}
      />,
    )

    expect(screen.getByRole('button', { name: /pull trigger/i })).toBeEnabled()
    expect(screen.getByTestId('slot-video')).toHaveAttribute('data-looping', 'false')
    expect(screen.queryByTestId('revolver-video')).not.toBeInTheDocument()
  })

  it('keeps the slot machine loop visible while the wallet signature is pending', () => {
    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        isAwaitingSignature
      />,
    )

    expect(screen.getByTestId('slot-video')).toHaveAttribute('data-looping', 'true')
    expect(screen.queryByTestId('revolver-video')).not.toBeInTheDocument()
  })

  it('keeps the slot machine looping while the transaction is pending', async () => {
    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        isPending
      />,
    )

    expect(screen.getByTestId('slot-video')).toHaveAttribute('data-looping', 'true')
    expect(screen.queryByTestId('revolver-video')).not.toBeInTheDocument()
  })

  it('hides the main layout and plays a fullscreen revolver finale after a lost result', () => {
    const result: ButWhatIfResult = {
      type: 'lost',
      me: '0x000000000000000000000000000000000000bEEF',
      hardcoreLevel: 123n,
      definitelyNotMyPrivKey: `0x${'12'.repeat(32)}`,
    }

    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        txHash="0x1234"
        result={result}
      />,
    )

    expect(screen.getByTestId('finale-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('finale-revolver-video')).toBeInTheDocument()
    expect(screen.queryByLabelText(/duel table/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('finale-reveal')).not.toBeInTheDocument()
  })

  it('reveals the western result banner after the finale revolver video ends', () => {
    const result: ButWhatIfResult = {
      type: 'lost',
      me: '0x000000000000000000000000000000000000bEEF',
      hardcoreLevel: 123n,
      definitelyNotMyPrivKey: `0x${'12'.repeat(32)}`,
    }

    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        txHash="0x1234"
        result={result}
      />,
    )

    fireEvent.ended(screen.getByTestId('finale-revolver-video'))

    expect(screen.getByTestId('finale-reveal')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /you lost/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('toggles the active network from the badge', async () => {
    const onToggleNetwork = vi.fn()
    render(<PureDuelApp {...defaultProps} onToggleNetwork={onToggleNetwork} />)

    await userEvent.click(screen.getByTestId('network-badge'))

    expect(onToggleNetwork).toHaveBeenCalledOnce()
    expect(screen.getByTestId('network-badge')).toHaveAttribute('aria-label', 'Switch to Mainnet')
  })

  it('reveals a won banner after the finale revolver video ends', () => {
    const result: ButWhatIfResult = {
      type: 'won',
      suicider: '0x000000000000000000000000000000000000bEEF',
      amount: 1_000_000_000_000_000_000n,
    }

    render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        txHash="0x1234"
        result={result}
      />,
    )

    fireEvent.ended(screen.getByTestId('finale-revolver-video'))

    expect(screen.getByRole('heading', { name: /you won/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('returns to the main layout when try again is clicked', () => {
    const onTryAgain = vi.fn()
    const result: ButWhatIfResult = {
      type: 'lost',
      me: '0x000000000000000000000000000000000000bEEF',
      hardcoreLevel: 123n,
      definitelyNotMyPrivKey: `0x${'12'.repeat(32)}`,
    }

    const { rerender } = render(
      <PureDuelApp
        {...defaultProps}
        isConnected
        onTryAgain={onTryAgain}
        txHash="0x1234"
        result={result}
      />,
    )

    fireEvent.ended(screen.getByTestId('finale-revolver-video'))
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(onTryAgain).toHaveBeenCalledOnce()

    rerender(
      <PureDuelApp
        {...defaultProps}
        isConnected
        onTryAgain={onTryAgain}
        txHash={undefined}
        result={null}
      />,
    )

    expect(screen.getByLabelText(/duel table/i)).toBeInTheDocument()
    expect(screen.queryByTestId('finale-overlay')).not.toBeInTheDocument()
  })
})
