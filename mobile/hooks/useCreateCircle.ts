import { useState, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';

interface CreateCircleParams {
  name: string;
  maxMembers: number;
  contributionUSDT: number;   // human units, converted to 6-decimal USDT
  frequencySeconds: number;
}

export function useCreateCircle() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const createCircle = useCallback(
    async (params: CreateCircleParams) => {
      setTxState('signing');
      setError(null);
      setTxHash(null);
      try {
        const contribution = parseUnits(String(params.contributionUSDT), 6);
        setTxState('confirming');
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          abi: AJO_CIRCLE_ABI,
          functionName: 'createCircle',
          args: [
            params.name,
            BigInt(params.maxMembers),
            contribution,
            BigInt(params.frequencySeconds),
          ],
        });
        setTxHash(hash);
        setTxState('success');
        return hash;
      } catch (e: any) {
        setError(e?.shortMessage ?? e?.message ?? 'Failed to create circle');
        setTxState('error');
        throw e;
      }
    },
    [writeContractAsync],
  );

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
