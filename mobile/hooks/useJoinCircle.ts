import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';

export function useJoinCircle() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  // joinCircle requires no approval — it's a free membership registration.
  const joinCircle = useCallback(async (circleId: number) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.AJO_CIRCLE,
        abi: AJO_CIRCLE_ABI,
        functionName: 'joinCircle',
        args: [BigInt(circleId)],
      });
      setTxHash(hash);
      setTxState('confirming');
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed');
      setTxState('error');
    }
  }, [writeContractAsync]);

  const { isSuccess: receiptSuccess } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    if (receiptSuccess && txState === 'confirming') {
      setTxState('success');
    }
  }, [receiptSuccess, txState]);

  const reset = useCallback(() => {
    setTxState('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    joinCircle,
    txState,
    txHash,
    error,
    isSuccess: txState === 'success',
    isPending: txState === 'signing' || txState === 'confirming',
    reset,
  };
}
