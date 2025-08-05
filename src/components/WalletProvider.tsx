// src/components/WalletProvider.tsx
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, lightTheme, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Chain } from 'viem';
import type { ReactNode } from 'react';
import { glyphWalletRK } from "@use-glyph/sdk-react";
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createPublicClient, http } from 'viem'; // ✅ FIX


const connectors = connectorsForWallets(
  [
    {
      groupName: 'Glyph',
      wallets: [glyphWalletRK],
    },
    {
      groupName: 'Other Wallets',
      wallets: [rainbowWallet, metaMaskWallet],
    },
  ],
  {
    appName: 'Deng Defense',
    projectId: 'ec846cc8cfaadc7743c39b5bbe99ade5',
  }
);

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

const config = createConfig({
  connectors,
  chains: [apechain],
  client: ({ chain }) =>
    createPublicClient({
      chain,
      transport: http(),
    }),
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={lightTheme()} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}