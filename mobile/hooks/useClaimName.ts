import { useState, useCallback } from 'react';
import { encodeFunctionData, type Hex } from 'viem';
import { publicClient } from '../lib/viemWalletClient';
import { magic } from '../lib/magicClient';
import { withTimeout } from '../lib/withTimeout';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

type ClaimState = 'idle' | 'signing' | 'confirming' | 'done' | 'error';

export function useClaimName() {
  const [state, setState] = useState<ClaimState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const claim = useCallback(async (name: string): Promise<boolean> => {
    setState('signing');
    setError(null);
    setTxHash(null);

    try {
      // Get the user's wallet address from Magic
      const provider = magic.rpcProvider as unknown as {
        request: (args: { method: string; params?: any[] }) => Promise<any>;
      };

      const accounts: string[] = await provider.request({ method: 'eth_accounts' });
      const from = accounts?.[0];
      if (!from) throw new Error('No wallet connected');

      const data = encodeFunctionData({
        abi: USERNAME_REGISTRY_ABI,
        functionName: 'claim',
        args: [name],
      });

      const to = CONTRACT_ADDRESSES.USERNAME_REGISTRY;

      // Use our own Infura RPC for all fee/gas estimation — 10s timeout each
      const [gasEstimateRaw, feeData, pendingNonce] = await withTimeout(
        Promise.all([
          publicClient.estimateGas({ account: from as Hex, to, data }).catch(() => 100000n),
          publicClient.estimateFeesPerGas(),
          publicClient.getTransactionCount({ address: from as Hex, blockTag: 'pending' }),
        ]),
        10_000,
        'Gas estimation',
      );

      // 50% gas + fee bump to replace any stuck pending transaction
      const gas = (gasEstimateRaw * 150n) / 100n;
      const maxFeePerGas = (feeData.maxFeePerGas ?? 3000000000n) * 150n / 100n;
      const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas ?? 1500000000n) * 150n / 100n;

      // Send through Magic's relay — 30s timeout
      const hashRaw = await withTimeout(
        provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from, to, data,
            gas: `0x${gas.toString(16)}`,
            maxFeePerGas: `0x${maxFeePerGas.toString(16)}`,
            maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}`,
            nonce: `0x${pendingNonce.toString(16)}`,
          }],
        }),
        30_000,
        'Transaction send',
      );

      const hash = hashRaw as `0x${string}`;
      setTxHash(hash);
      setState('confirming');

      // Wait for confirmation — 90s timeout (Sepolia can be slow)
      await withTimeout(
        publicClient.waitForTransactionReceipt({ hash, confirmations: 1 }),
        90_000,
        'Transaction confirmation',
      );

      setState('done');
      return true;
    } catch (e: any) {
      const raw: string = e?.shortMessage ?? e?.message ?? String(e);

      let msg = 'Transaction failed';
      if (raw.includes('NameTaken')) msg = 'That name is already taken';
      else if (raw.includes('CooldownActive')) msg = 'Wait 24h before changing your name';
      else if (raw.includes('InvalidName')) msg = 'Invalid name — letters, numbers, hyphens only';
      else if (raw.includes('insufficient') || raw.includes('funds')) msg = 'Not enough ETH for gas';
      else if (raw.includes('underpriced') || raw.includes('replacement')) msg = 'Please try again — previous attempt still pending';
      else if (raw.includes('rejected') || raw.includes('denied') || raw.includes('cancel')) msg = 'Transaction cancelled';
      else if (raw.length < 120) msg = raw;

      console.error('[useClaimName] error raw:', raw);
      console.error('[useClaimName] error object:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
      setError(msg);
      setState('error');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return { claim, state, error, txHash, reset };
}
