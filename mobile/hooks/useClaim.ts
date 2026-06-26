import { useState, useCallback } from 'react';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI, ROLLA_VAULT_ABI } from '../constants/abis';
import { sendTx } from '../lib/sendTx';

type ClaimParams =
  | { type: 'circle'; circleId: number; tokenOut: `0x${string}`; amountOutMinimum: bigint; poolFee: number }
  | { type: 'vault';  vaultId: number;  tokenOut: `0x${string}`; amountOutMinimum: bigint; poolFee: number };

export function useClaim() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async (params: ClaimParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      setTxState('confirming');
      let hash: `0x${string}`;

      if (params.type === 'circle') {
        hash = await sendTx({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          abi: AJO_CIRCLE_ABI,
          functionName: 'claimPayout',
          args: [BigInt(params.circleId), params.tokenOut, params.amountOutMinimum, params.poolFee],
        });
      } else {
        hash = await sendTx({
          address: CONTRACT_ADDRESSES.ROLLA_VAULT,
          abi: ROLLA_VAULT_ABI,
          functionName: 'claim',
          args: [BigInt(params.vaultId), params.tokenOut, params.amountOutMinimum, params.poolFee],
        });
      }

      setTxHash(hash);
      setTxState('success');
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed');
      setTxState('error');
    }
  }, []);

  const reset = useCallback(() => { setTxState('idle'); setError(null); setTxHash(null); }, []);

  return { claim, txState, txHash, error,
    isPending: txState === 'signing' || txState === 'confirming',
    isSuccess: txState === 'success', reset };
}
