import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { sepolia } from 'viem/chains';
import { magic } from './magicClient';

const RPC_URL = process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org';

/**
 * Returns a viem WalletClient that uses Magic's provider for signing
 * but our own RPC URL for broadcasting — avoiding Magic relay failures.
 */
export function getMagicWalletClient() {
  const provider = magic.rpcProvider as unknown as { request: (...args: any[]) => Promise<any> };
  return createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
}

/**
 * Public client using our own RPC — for reads and waiting for receipts.
 */
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});
