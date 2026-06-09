import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEther, type Address, type Hex } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import {
  butWhatIfAbi,
  decodeButWhatIfReceipt,
  type ButWhatIfResult,
} from './contract'
import {
  defaultButWhatIfChainId,
  getAlternateButWhatIfChainId,
  getButWhatIfAddress,
  getButWhatIfAddressUrl,
  getButWhatIfNetwork,
  getButWhatIfTxUrl,
} from './networks'
import { getGunOpacity, getNextPhaseAfterInput, isValidLuckyNumber, type DuelPhase } from './duelFlow'

const revolverVideo = '/assets/revolver-shot.mp4'
const slotVideo = '/assets/slot-machine.mp4'
const tableImage = '/assets/table-empty.jpeg'

function logDuel(event: string, payload?: Record<string, unknown>) {
  console.log(`[ButWhatIf] ${event}`, payload ?? {})
}

function safePause(video: HTMLVideoElement) {
  try {
    video.pause()
  } catch {
    // jsdom does not implement media controls
  }
}

function safePlay(video: HTMLVideoElement) {
  try {
    void video.play()
  } catch {
    // jsdom does not implement media controls
  }
}

type PureDuelAppProps = {
  accountAddress: Address | undefined
  connectLabel: string
  contractAddressUrl: string
  isConnected: boolean
  isConnecting: boolean
  isAwaitingSignature: boolean
  isPending: boolean
  isSwitchingNetwork: boolean
  networkLabel: string
  nextNetworkLabel: string
  onConnect: () => void
  onDisconnect: () => void
  onPullTrigger: (luckyNumber: string) => void
  onToggleNetwork: () => void
  onTryAgain: () => void
  txHash: Hex | undefined
  result: ButWhatIfResult | null
  errorMessage: string | undefined
  getExplorerUrl: (txHash: Hex | undefined) => string | undefined
}

function shortenAddress(address: Address | undefined) {
  if (!address) return 'No wallet'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getResultCopy(result: ButWhatIfResult | null) {
  if (!result) {
    return {
      eyebrow: 'Awaiting shot',
      title: 'Nothing on the table yet',
      body: 'Enter a lucky number. The gun wakes up as the odds get worse.',
    }
  }

  if (result.type === 'won') {
    return {
      eyebrow: 'YouWon',
      title: 'YOU WON',
      body: `You lucky bastard ;) Balance at the trigger: ${formatEther(result.amount)} ETH.`,
    }
  }

  return {
    eyebrow: 'YouLost',
    title: 'YOU LOST',
    body: `The house already knew. Digest: ${result.definitelyNotMyPrivKey.slice(0, 18)}...${result.definitelyNotMyPrivKey.slice(-8)}`,
  }
}

export function PureDuelApp({
  accountAddress,
  connectLabel,
  contractAddressUrl,
  isConnected,
  isConnecting,
  isAwaitingSignature,
  isPending,
  isSwitchingNetwork,
  networkLabel,
  nextNetworkLabel,
  onConnect,
  onDisconnect,
  onPullTrigger,
  onToggleNetwork,
  onTryAgain,
  txHash,
  result,
  errorMessage,
  getExplorerUrl,
}: PureDuelAppProps) {
  const [luckyNumber, setLuckyNumber] = useState('')
  const [manualPhase, setManualPhase] = useState<DuelPhase>('idle')
  const [finalePhase, setFinalePhase] = useState<'idle' | 'shooting' | 'revealed'>('idle')
  const previousResultRef = useRef<ButWhatIfResult | null>(null)
  const shotVideoRef = useRef<HTMLVideoElement>(null)
  const slotVideoRef = useRef<HTMLVideoElement>(null)

  const gunOpacity = getGunOpacity(luckyNumber)
  const resultCopy = getResultCopy(result)
  const explorerUrl = getExplorerUrl(txHash)
  const canUseTrigger = isValidLuckyNumber(luckyNumber) && !isAwaitingSignature && !isPending
  const inputPhase = getNextPhaseAfterInput(luckyNumber, 'idle')
  const phase: DuelPhase = isPending
    ? 'pending'
    : result?.type === 'won'
      ? 'won'
      : result?.type === 'lost'
        ? 'lost'
        : isAwaitingSignature || (manualPhase === 'shooting' && !txHash && !errorMessage)
          ? 'shooting'
          : inputPhase
  const isCasinoLoop = phase === 'shooting' || phase === 'pending'
  const isFinaleActive = finalePhase !== 'idle'

  useEffect(() => {
    logDuel('ui state', {
      phase,
      finalePhase,
      luckyNumber,
      isConnected,
      isAwaitingSignature,
      isPending,
      txHash,
      hasResult: Boolean(result),
      errorMessage,
    })
  }, [errorMessage, finalePhase, isAwaitingSignature, isConnected, isPending, luckyNumber, phase, result, txHash])

  useEffect(() => {
    if (!result) {
      setFinalePhase('idle')
      previousResultRef.current = null
      return
    }

    if (!previousResultRef.current) {
      setFinalePhase('shooting')
    }

    previousResultRef.current = result
  }, [result])

  useEffect(() => {
    const slot = slotVideoRef.current
    if (!slot || isFinaleActive) return

    const pauseOnFirstFrame = () => {
      safePause(slot)
      slot.currentTime = 0
    }

    if (isCasinoLoop) {
      safePlay(slot)
      return
    }

    pauseOnFirstFrame()
    if (slot.readyState < 1) {
      slot.addEventListener('loadeddata', pauseOnFirstFrame, { once: true })
      return () => slot.removeEventListener('loadeddata', pauseOnFirstFrame)
    }
  }, [isCasinoLoop, isFinaleActive])

  useEffect(() => {
    if (finalePhase !== 'shooting') return

    const shot = shotVideoRef.current
    if (!shot) return

    shot.currentTime = 0
    safePlay(shot)
  }, [finalePhase])

  function handleFinaleEnded() {
    setFinalePhase('revealed')
  }

  function handleTryAgain() {
    logDuel('try again clicked')
    setFinalePhase('idle')
    setManualPhase('idle')
    onTryAgain()
  }

  function handlePullTrigger() {
    logDuel('trigger clicked', {
      luckyNumber,
      isConnected,
      canUseTrigger,
      isAwaitingSignature,
      isPending,
    })

    if (!canUseTrigger) return

    if (!isConnected) {
      logDuel('wallet connect requested from trigger')
      onConnect()
      return
    }

    setManualPhase('shooting')
    onPullTrigger(luckyNumber)
  }

  return (
    <>
      {!isFinaleActive ? (
    <main className="app-shell">
      <nav className="top-bar">
        <div className="top-bar-start">
          <a className="brand" href={contractAddressUrl}>
            But What If?
          </a>
          <button
            className={`network-badge network-${networkLabel.toLowerCase()}`}
            type="button"
            data-testid="network-badge"
            disabled={isSwitchingNetwork}
            aria-label={`Switch to ${nextNetworkLabel}`}
            title={`Switch to ${nextNetworkLabel}`}
            onClick={onToggleNetwork}
          >
            {isSwitchingNetwork ? 'Switching...' : networkLabel}
          </button>
        </div>
        <div className="wallet-box">
          <span>{shortenAddress(accountAddress)}</span>
          {isConnected ? (
            <button className="ghost-button" type="button" onClick={onDisconnect}>
              Disconnect
            </button>
          ) : (
            <button className="ghost-button" type="button" onClick={onConnect} disabled={isConnecting}>
              {connectLabel}
            </button>
          )}
        </div>
      </nav>

      <section className="duel-table" aria-label="Duel table">
        <aside className="control-column">
          <div className="hero-copy">
            <p className="kicker">A contract that won't steal your money.</p>
            <h1>Pull the trigger on public randomness.</h1>
            <p>
              Pick a number, sign the shot, and watch the chain prove why the mempool already knows
              what you are about to learn.
            </p>
          </div>

          <div className="control-panel">
            <label className="field">
              <span>Lucky number</span>
              <input
                inputMode="numeric"
                min="0"
                pattern="[0-9]*"
                placeholder="13"
                type="text"
                value={luckyNumber}
                onChange={(event) => {
                  logDuel('lucky number changed', { value: event.target.value })
                  setLuckyNumber(event.target.value)
                }}
              />
            </label>

            <button className="trigger-button" type="button" disabled={!canUseTrigger} onClick={handlePullTrigger}>
              {phase === 'pending' ? 'Spinning...' : phase === 'shooting' ? 'Sign the shot' : 'Pull trigger'}
            </button>

            <article className={`result-card result-${errorMessage ? 'error' : phase}`}>
              <span className="result-eyebrow">{errorMessage ? 'Error' : resultCopy.eyebrow}</span>
              <h2>{errorMessage ? 'The chamber jammed' : resultCopy.title}</h2>
              <p>{errorMessage ?? resultCopy.body}</p>
            </article>
          </div>
        </aside>

        <div className="stage">
          <img className="table-backdrop" src={tableImage} alt="" />
          <div
            className="revolver-stage"
            data-testid="revolver-stage"
            style={{ opacity: isCasinoLoop ? 1 : gunOpacity }}
          >
            <video
              ref={slotVideoRef}
              data-testid="slot-video"
              data-looping={isCasinoLoop ? 'true' : 'false'}
              src={slotVideo}
              muted
              loop={isCasinoLoop}
              playsInline
              preload="auto"
            />
          </div>
        </div>
      </section>
    </main>
      ) : null}

      {isFinaleActive && result ? (
        <div className="finale-overlay" data-testid="finale-overlay">
          {finalePhase === 'shooting' ? (
            <video
              ref={shotVideoRef}
              className="finale-video"
              data-testid="finale-revolver-video"
              src={revolverVideo}
              muted
              playsInline
              preload="auto"
              onEnded={handleFinaleEnded}
            />
          ) : (
            <div className="finale-reveal" data-testid="finale-reveal">
              <p className="finale-kicker">{resultCopy.eyebrow}</p>
              <h1 className={`finale-banner finale-${result.type}`}>{resultCopy.title}</h1>
              <p className="finale-subtitle">{resultCopy.body}</p>
              {explorerUrl ? (
                <a className="finale-link" href={explorerUrl} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              ) : null}
              <button className="try-again-button" type="button" onClick={handleTryAgain}>
                Try again
              </button>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

export default function App() {
  const [submittedHash, setSubmittedHash] = useState<Hex>()
  const [activeChainId, setActiveChainId] = useState(defaultButWhatIfChainId)
  const { address, chainId, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending: isConnectPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitchPending, error: switchError } = useSwitchChain()
  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract({
    mutation: {
      onSuccess: (transactionHash) => {
        logDuel('transaction hash received', { hash: transactionHash })
        setSubmittedHash(transactionHash)
      },
    },
  })
  const {
    data: receipt,
    isLoading: isReceiptPending,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: submittedHash,
  })

  const result = useMemo(() => {
    if (!receipt || !submittedHash) return null
    return decodeButWhatIfReceipt(receipt.logs)
  }, [receipt, submittedHash])

  const activeNetwork = getButWhatIfNetwork(activeChainId)
  const nextNetwork = getButWhatIfNetwork(getAlternateButWhatIfChainId(activeChainId))
  const errorMessage =
    connectError?.message ?? switchError?.message ?? writeError?.message ?? receiptError?.message
  const connector = connectors[0]

  useEffect(() => {
    if (isConnected && chainId) {
      setActiveChainId(chainId)
    }
  }, [chainId, isConnected])

  useEffect(() => {
    logDuel('wagmi state', {
      address,
      activeChainId,
      chainId,
      isConnected,
      isConnecting,
      isConnectPending,
      isWritePending,
      isReceiptPending,
      hash,
      submittedHash,
      connectError: connectError?.message,
      switchError: switchError?.message,
      writeError: writeError?.message,
      receiptError: receiptError?.message,
      result,
    })
  }, [
    activeChainId,
    address,
    chainId,
    connectError?.message,
    hash,
    isConnectPending,
    isConnected,
    isConnecting,
    isReceiptPending,
    isWritePending,
    receiptError?.message,
    result,
    submittedHash,
    switchError?.message,
    writeError?.message,
  ])

  function handleConnect() {
    logDuel('connect clicked', { connector: connector?.name })
    if (connector) connect({ connector })
  }

  function handleToggleNetwork() {
    const nextChainId = getAlternateButWhatIfChainId(activeChainId)
    logDuel('network toggle requested', { from: activeChainId, to: nextChainId, isConnected })
    setSubmittedHash(undefined)

    if (isConnected) {
      switchChain({ chainId: nextChainId })
      return
    }

    setActiveChainId(nextChainId)
  }

  function handleTryAgain() {
    logDuel('round reset requested')
    setSubmittedHash(undefined)
  }

  function handlePullTrigger(luckyNumber: string) {
    logDuel('writeContract requested', { luckyNumber, chainId: activeChainId })
    setSubmittedHash(undefined)
    writeContract({
      address: getButWhatIfAddress(activeChainId),
      abi: butWhatIfAbi,
      functionName: 'whatIf',
      args: [BigInt(luckyNumber)],
      chainId: activeChainId,
    })
  }

  return (
    <PureDuelApp
      accountAddress={address}
      connectLabel={isConnectPending ? 'Connecting...' : 'Connect wallet'}
      contractAddressUrl={getButWhatIfAddressUrl(activeChainId)}
      isConnected={isConnected}
      isConnecting={isConnecting || isConnectPending}
      isAwaitingSignature={isWritePending && !submittedHash}
      isPending={Boolean(submittedHash) && isReceiptPending}
      isSwitchingNetwork={isSwitchPending}
      networkLabel={activeNetwork.label}
      nextNetworkLabel={nextNetwork.label}
      onConnect={handleConnect}
      onDisconnect={() => disconnect()}
      onPullTrigger={handlePullTrigger}
      onToggleNetwork={handleToggleNetwork}
      onTryAgain={handleTryAgain}
      txHash={submittedHash}
      result={result}
      errorMessage={errorMessage}
      getExplorerUrl={(txHash) => (txHash ? getButWhatIfTxUrl(activeChainId, txHash) : undefined)}
    />
  )
}
