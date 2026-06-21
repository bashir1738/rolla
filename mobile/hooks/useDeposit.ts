import { useState, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES, TOKEN_ADDRESSES } from '../constants/addresses';
import { ROLLA_VAULT_ABI } from '../constants/abis';

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

  const { writeContractAsync } = useWriteContract();

  const deposit = useCallback(async (params: DepositParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';

      if (!isNative) {
        // Approve vault to spend token
        await writeContractAsync({
          address: params.tokenIn,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.ROLLA_VAULT, params.amountIn],
        });
      }

      setTxState('confirming');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.ROLLA_VAULT,
        abi: ROLLA_VAULT_ABI,
        functionName: 'deposit',
        args: [params.tier, params.tokenIn, params.amountIn, params.amountOutMinimum, params.poolFee],
        value: isNative ? params.amountIn : undefined,
      });

      setTxHash(hash);
      setTxState('success');
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed');
      setTxState('error');
    }
  }, [writeContractAsync]);

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
