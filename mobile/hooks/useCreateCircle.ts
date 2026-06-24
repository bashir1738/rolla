import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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

  // Wait for the tx to actually mine before declaring success.
  const { isSuccess: mined, isError: revertedOnChain, error: receiptError } =
    useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (txState !== 'confirming') return;
    if (mined) setTxState('success');
    else if (revertedOnChain) {
      setError(receiptError?.message ?? 'Transaction reverted on-chain');
      setTxState('error');
    }
  }, [mined, revertedOnChain, receiptError, txState]);

  const createCircle = useCallback(
    async (params: CreateCircleParams) => {
      setTxState('signing');
      setError(null);
      setTxHash(null);
      try {
        const contribution = parseUnits(String(params.contributionUSDT), 6);
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
        setTxState('confirming'); // now wait for the receipt
        return hash;
      } catch (e: any) {
        if (__DEV__) console.warn('[createCircle] failed:', e);
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
