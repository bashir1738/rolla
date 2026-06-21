import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit-wagmi-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TxState = 'idle' | 'signing' | 'confirming' | 'success' | 'error';

interface WalletContextValue {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  chainId: number | undefined;
}

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  chainId: undefined,
});

// Removes all WalletConnect v2 AsyncStorage entries so stale sessions
// don't block reconnection after the wallet app clears its own sessions.
async function clearStaleWCSessions() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(
      (k) => k.startsWith('wc@') || k.startsWith('@walletconnect') || k.includes('WALLETCONNECT'),
    );
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {}
}

const isWCInternalError = (msg: string) =>
  // Stale session — wallet app cleared its sessions
  msg.includes("session topic doesn't exist") ||
  msg.includes('No matching key') ||
  msg.includes('Missing or invalid. session topic') ||
  // Race condition — relay delivers an event before SignClient finishes init
  msg.includes("Cannot read property 'request' of undefined") ||
  msg.includes("Cannot read properties of undefined (reading 'request')") ||
  // Generic WC provider not ready
  msg.includes('provider is not initialized') ||
  msg.includes('session is not connected');

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useAppKit();

  const disconnect = useCallback(() => {
    try { wagmiDisconnect(); } catch {}
  }, [wagmiDisconnect]);

  useEffect(() => {
    // WalletConnect relay sends messages for sessions that no longer exist in
    // the wallet app (e.g. after wallet reinstall or storage clear). Intercept
    // the resulting unhandled rejection, wipe stale storage, and disconnect so
    // the user can pair a fresh session.
    const original = (global as any).ErrorUtils?.getGlobalHandler?.();

    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      if (!isFatal && isWCInternalError(error?.message ?? '')) {
        // For stale-session errors clear storage + disconnect so the user
        // gets a clean reconnect prompt. For pure race-condition errors
        // (client not ready) we just suppress — no storage cleanup needed.
        const msg = error?.message ?? '';
        if (
          msg.includes("session topic doesn't exist") ||
          msg.includes('No matching key') ||
          msg.includes('Missing or invalid. session topic')
        ) {
          clearStaleWCSessions().then(() => disconnect());
        }
        return; // suppress all WC internal errors from the global crash handler
      }
      original?.(error, isFatal);
    });

    return () => {
      (global as any).ErrorUtils?.setGlobalHandler?.(original);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{ address, isConnected, connect: () => open(), disconnect, chainId }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
