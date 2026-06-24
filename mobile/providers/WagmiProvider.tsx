import '../polyfills';
import React from 'react';
import { WagmiProvider as WagmiCoreProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { magicConnector } from '../lib/magicConnector';

const SEPOLIA_RPC_URL = process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [magicConnector()],
  transports: { [sepolia.id]: http(SEPOLIA_RPC_URL) },
});

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

export function WagmiQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiCoreProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiCoreProvider>
  );
}
