import { useState, useCallback } from 'react';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { ROLLA_VAULT_ABI } from '../constants/abis';
import { sendTx } from '../lib/sendTx';
import { publicClient } from '../lib/viemWalletClient';
import { withTimeout } from '../lib/withTimeout';

const ERC20_APPROVE_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
] as const;

interface DepositParams {
  tier: 0 | 1 | 2;
  tokenIn: `0x${string}`;
  amountIn: bigint;
  amountOutMinimum: bigint;
  poolFee: number;
}

export function useDeposit() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(async (params: DepositParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';

      if (!isNative) {
        const approveHash = await sendTx({
          address: params.tokenIn,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.ROLLA_VAULT, params.amountIn],
        });
        await withTimeout(
          publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 }),
          90_000, 'Approval confirmation',
        );
      }

      const hash = await sendTx({
        address: CONTRACT_ADDRESSES.ROLLA_VAULT,
        abi: ROLLA_VAULT_ABI,
        functionName: 'deposit',
        args: [params.tier, params.tokenIn, params.amountIn, params.amountOutMinimum, params.poolFee],
        value: isNative ? params.amountIn : undefined,
      });

      setTxHash(hash);
      setTxState('confirming');

      await withTimeout(
        publicClient.waitForTransactionReceipt({ hash, confirmations: 1 }),
        90_000, 'Deposit confirmation',
      );
      setTxState('success');
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed');
      setTxState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setTxState('idle');
    setError(null);
    setTxHash(null);
    setVaultId(null);
  }, []);

  return { deposit, txState, txHash, vaultId, error,
    isPending: txState === 'signing' || txState === 'confirming',
    isSuccess: txState === 'success', reset };
}
