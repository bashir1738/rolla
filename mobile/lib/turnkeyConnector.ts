/**
 * Wagmi connector backed by Turnkey (via your backend API).
 *
 * Reads  → public RPC (no auth needed, viem publicClient)
 * Writes → serialize unsigned tx client-side (pure viem/JS) →
 *           backend signs with Turnkey → broadcast via public RPC
 *
 * This is 100% pure JS — no native modules, works in Expo Go.
 */

import { createConnector } from 'wagmi';
import {
  createPublicClient, http, serializeTransaction,
  type EIP1193Provider, type Address, type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';
import { signSerializedTx, signMessage, type TurnkeySession } from './turnkeyService';

export const TURNKEY_CONNECTOR_ID = 'turnkey-social';
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_HEX = '0xaa36a7';

// Module-level session ref — WalletContext keeps this in sync.
export const turnkeySessionRef: { current: TurnkeySession | null } = { current: null };

// Lazy public client — reused across requests.
let _publicClient: ReturnType<typeof createPublicClient> | null = null;
function publicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL),
    });
  }
  return _publicClient;
}

export function turnkeyConnector() {
  return createConnector<EIP1193Provider>((config) => {
    const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};

    function emit(event: string, ...args: unknown[]) {
      listeners[event]?.forEach((fn) => fn(...args));
    }

    // ── Minimal EIP-1193 provider ──────────────────────────────────────────
    const provider = {
      on(event: string, handler: (...args: unknown[]) => void) {
        if (!listeners[event]) listeners[event] = new Set();
        listeners[event].add(handler);
      },
      removeListener(event: string, handler: (...args: unknown[]) => void) {
        listeners[event]?.delete(handler);
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async request({ method, params }: { method: string; params?: unknown }): Promise<any> {
        const session = turnkeySessionRef.current;

        switch (method) {
          case 'eth_accounts':
            return session ? [session.address] : [];

          case 'eth_chainId':
            return SEPOLIA_HEX;

          // ── Transaction signing via Turnkey backend ──────────────────────
          case 'eth_sendTransaction': {
            if (!session) throw new Error('Not authenticated with Turnkey.');
            const [txReq] = params as [Record<string, unknown>];
            const pc = publicClient();

            const [nonce, fees, gasEstimate] = await Promise.all([
              pc.getTransactionCount({ address: session.address }),
              pc.estimateFeesPerGas(),
              pc.estimateGas({
                account: session.address,
                to: txReq.to as Address,
                data: txReq.data as Hex | undefined,
                value: txReq.value ? BigInt(txReq.value as string) : undefined,
              }).catch(() => 200_000n),
            ]);

            const serialized = serializeTransaction({
              chainId: SEPOLIA_CHAIN_ID,
              type: 'eip1559',
              to: txReq.to as Address,
              data: txReq.data as Hex | undefined,
              value: txReq.value ? BigInt(txReq.value as string) : 0n,
              nonce,
              gas: gasEstimate,
              maxFeePerGas: fees.maxFeePerGas,
              maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
            });

            const signedTx = await signSerializedTx(session.sessionToken, serialized);
            const hash = await pc.sendRawTransaction({ serializedTransaction: signedTx });
            return hash;
          }

          // ── Message signing via Turnkey backend ─────────────────────────
          case 'personal_sign': {
            if (!session) throw new Error('Not authenticated with Turnkey.');
            const [messageHex] = params as [string];
            return signMessage(session.sessionToken, messageHex);
          }

          case 'eth_sign': {
            if (!session) throw new Error('Not authenticated with Turnkey.');
            const [, messageHex] = params as [string, string];
            return signMessage(session.sessionToken, messageHex);
          }

          // ── Forward everything else to the public RPC ───────────────────
          default:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (publicClient() as any).request({ method, params });
        }
      },
    };

    // ── Wagmi connector interface ──────────────────────────────────────────
    return {
      id: TURNKEY_CONNECTOR_ID,
      name: 'Rolla Wallet',
      type: 'turnkey',

      async setup() {},

      async connect() {
        const session = turnkeySessionRef.current;
        if (!session) throw new Error('No Turnkey session — sign in first.');
        config.emitter.emit('change', { accounts: [session.address] });
        return { accounts: [session.address] as never, chainId: SEPOLIA_CHAIN_ID };
      },

      async disconnect() {
        turnkeySessionRef.current = null;
        config.emitter.emit('disconnect');
      },

      async getAccounts() {
        const session = turnkeySessionRef.current;
        return session ? [session.address] : [];
      },

      async getChainId() {
        return SEPOLIA_CHAIN_ID;
      },

      async getProvider() {
        return provider as unknown as EIP1193Provider;
      },

      async isAuthorized() {
        return !!turnkeySessionRef.current;
      },

      async switchChain({ chainId }) {
        const chain = config.chains.find((c) => c.id === chainId);
        if (!chain) throw new Error(`Chain ${chainId} not configured.`);
        config.emitter.emit('change', { chainId });
        return chain;
      },

      onAccountsChanged(accounts: string[]) {
        if (accounts.length === 0) config.emitter.emit('disconnect');
        else config.emitter.emit('change', { accounts: accounts as Address[] });
      },

      onChainChanged(chain: string) {
        config.emitter.emit('change', { chainId: Number(chain) });
      },

      onDisconnect() {
        config.emitter.emit('disconnect');
      },
    };
  });
}
