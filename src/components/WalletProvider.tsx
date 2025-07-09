// src/components/WalletProvider.tsx
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Chain } from 'viem';
import type { ReactNode } from 'react';

const apechain: Chain = {
  id: 33139,
  name: 'ApeChain',
  nativeCurrency: { name: 'ApeCoin', symbol: 'APE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://apechain.calderachain.xyz/http'] },
    public: { http: ['https://apechain.calderachain.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'ApeScan', url: 'https://apechain.calderaexplorer.xyz/' },
  },
};

const config = getDefaultConfig({
    appName: 'Ape Tower',
    chains: [apechain],
    projectId: 'WALLET_CONNECT_PROJECT_ID', // replace this
  });
  

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme()} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
