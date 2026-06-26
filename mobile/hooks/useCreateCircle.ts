import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';
import { sendTx } from '../lib/sendTx';
import { publicClient } from '../lib/viemWalletClient';
import { withTimeout } from '../lib/withTimeout';

interface CreateCircleParams {
  name: string;
  maxMembers: number;
  contributionUSDC: number;
  frequencySeconds: number;
}

export function useCreateCircle() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCircle = useCallback(async (params: CreateCircleParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const contribution = parseUnits(String(params.contributionUSDC), 6);
      const hash = await sendTx({
        address: CONTRACT_ADDRESSES.AJO_CIRCLE,
        abi: AJO_CIRCLE_ABI,
        functionName: 'createCircle',
        args: [params.name, BigInt(params.maxMembers), contribution, BigInt(params.frequencySeconds)],
      });
      setTxHash(hash);
      setTxState('confirming');

      await withTimeout(
        publicClient.waitForTransactionReceipt({ hash, confirmations: 1 }),
        90_000, 'Circle creation confirmation',
      );
      setTxState('success');
      return hash;
    } catch (e: any) {
      const msg: string = e?.shortMessage ?? e?.message ?? 'Failed to create circle';
      setError(msg);
      setTxState('error');
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setTxState('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    createCircle,
    txState,
    txHash,
    error,
    isPending: txState === 'signing' || txState === 'confirming',
    isSuccess: txState === 'success',
    reset,
  };
}
