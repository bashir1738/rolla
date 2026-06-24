import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { getAddress } from 'viem';
import { magic } from '../lib/magicClient';
import { MAGIC_CONNECTOR_ID } from '../lib/magicConnector';

async function getMagicAddress(retries = 3): Promise<`0x${string}` | null> {
  const provider = magic.rpcProvider as unknown as { request: (args: { method: string }) => Promise<string[]> };
  for (let i = 0; i < retries; i++) {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      const addr = accounts?.[0];
      if (addr) return getAddress(addr) as `0x${string}`;
    } catch {}
    // Brief wait before retry — new accounts may take a moment to provision
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

export type TxState = 'idle' | 'signing' | 'confirming' | 'success' | 'error';

interface WalletContextValue {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  connect: () => void;
  disconnect: () => void;
  isReady: boolean;
  isAuthenticated: boolean;
  isWalletReady: boolean;
  loginWithEmail: (email: string) => Promise<void>;
  isLoggingIn: boolean;
  loginVisible: boolean;
  closeLogin: () => void;
}

const noop = () => {};

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConnected: false,
  chainId: undefined,
  connect: noop,
  disconnect: noop,
  isReady: false,
  isAuthenticated: false,
  isWalletReady: false,
  loginWithEmail: async () => {},
  isLoggingIn: false,
  loginVisible: false,
  closeLogin: noop,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address: wagmiAddress, isConnected, chainId } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  // Fallback address from Magic metadata — used until wagmi wires up.
  const [magicAddress, setMagicAddress] = useState<`0x${string}` | undefined>();

  const wiringRef = useRef(false);

  const wireWagmi = useCallback(async () => {
    if (wiringRef.current) return;
    wiringRef.current = true;
    try {
      const connector = connectors.find((c) => c.id === MAGIC_CONNECTOR_ID);
      if (connector) await connectAsync({ connector });
    } catch (e: any) {
      // "Connector already connected" is fine — wagmi is ahead of our state.
      const msg: string = e?.message ?? '';
      if (!msg.includes('already connected') && __DEV__) {
        console.warn('[Magic] wagmi wiring failed:', e);
      }
    } finally {
      wiringRef.current = false;
    }
  }, [connectors, connectAsync]);

  // Restore existing Magic session on mount.
  useEffect(() => {
    magic.user.isLoggedIn()
      .then(async (loggedIn) => {
        if (loggedIn) {
          try {
            const addr = await getMagicAddress();
            if (addr) {
              setMagicAddress(addr);
              setIsAuthenticated(true);
              await wireWagmi();
            } else {
              await magic.user.logout().catch(() => {});
            }
          } catch {
            await magic.user.logout().catch(() => {});
          }
        }
        setIsReady(true);
      })
      .catch(() => setIsReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isConnected && magicAddress) wireWagmi();
  }, [isAuthenticated, isConnected, magicAddress, wireWagmi]);

  const loginWithEmail = useCallback(async (email: string) => {
    setLoginVisible(false);
    setIsLoggingIn(true);
    try {
      await magic.auth.loginWithEmailOTP({ email, showUI: true });
      const addr = await getMagicAddress();
      if (addr) setMagicAddress(addr);
      setIsAuthenticated(true);
      await wireWagmi();
    } catch (e) {
      if (__DEV__) console.warn('[Magic] Email login failed:', e);
      setLoginVisible(true);
    } finally {
      setIsLoggingIn(false);
    }
  }, [wireWagmi]);

  const disconnect = useCallback(async () => {
    // Clear state immediately so the UI updates on first tap, not second.
    setIsAuthenticated(false);
    setMagicAddress(undefined);
    try { await disconnectAsync(); } catch {}
    try { await magic.user.logout(); } catch {}
  }, [disconnectAsync]);

  const connect = useCallback(() => setLoginVisible(true), []);
  const closeLogin = useCallback(() => setLoginVisible(false), []);

  // wagmi address is authoritative once connected; Magic metadata is the fallback.
  const address = wagmiAddress ?? magicAddress;

  return (
    <WalletContext.Provider value={{
      address,
      isConnected: isConnected && isAuthenticated,
      chainId,
      connect,
      disconnect,
      isReady,
      isAuthenticated,
      isWalletReady: isAuthenticated && !!address,
      loginWithEmail,
      isLoggingIn,
      loginVisible,
      closeLogin,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
