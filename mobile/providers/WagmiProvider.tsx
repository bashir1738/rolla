import '../polyfills';
import React from 'react';
import { WagmiProvider as WagmiCoreProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from '@reown/appkit-wagmi-react-native';

// Provided via mobile/.env.local (EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID).
const WALLETCONNECT_PROJECT_ID =
  process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

if (!WALLETCONNECT_PROJECT_ID && __DEV__) {
  console.warn(
    '[Rolla] Missing EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID — set it in mobile/.env.local',
  );
}

const metadata = {
  name: 'Rolla',
  description: 'Rotating savings, reimagined onchain',
  url: 'https://rolla.app',
  icons: ['https://rolla.app/icon.png'],
  redirect: {
    native: 'rolla://',
    universal: 'https://rolla.app',
  },
};

// defaultWagmiConfig wires the WalletConnect connector + RN transports correctly
export const wagmiConfig = defaultWagmiConfig({
  chains: [sepolia],
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata,
});

// Initialize the AppKit modal (RN equivalent of RainbowKit / Web3Modal)
// Cast the options object: viem's `Chain` type skews between the hoisted viem
// version and the one @reown's types were built against, so `wagmiConfig` and
// `defaultChain` don't match nominally. They are structurally identical at runtime.
createAppKit({
  projectId: WALLETCONNECT_PROJECT_ID,
  wagmiConfig,
  defaultChain: sepolia,
  enableAnalytics: false,
} as unknown as Parameters<typeof createAppKit>[0]);

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

export function WagmiQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiCoreProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <AppKit />
      </QueryClientProvider>
    </WagmiCoreProvider>
  );
}
