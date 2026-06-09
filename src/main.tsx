import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createConfig, http, injected, WagmiProvider } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

import { supportedButWhatIfChains } from './networks'
import App from './App'
import './styles.css'

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: supportedButWhatIfChains,
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
