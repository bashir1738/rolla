import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { ROLLA_VAULT_ABI } from '../constants/abis';
import { wagmiConfig } from '../providers/WagmiProvider';

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

  // Wait for the deposit tx to actually mine before declaring success.
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

  const deposit = useCallback(async (params: DepositParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';

      if (!isNative) {
        const approveHash = await writeContractAsync({
          address: params.tokenIn,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.ROLLA_VAULT, params.amountIn],
        });
        // Wait for approve to be mined before deposit calls transferFrom
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.ROLLA_VAULT,
        abi: ROLLA_VAULT_ABI,
        functionName: 'deposit',
        args: [params.tier, params.tokenIn, params.amountIn, params.amountOutMinimum, params.poolFee],
        value: isNative ? params.amountIn : undefined,
      });

      setTxHash(hash);
      setTxState('confirming'); // now wait for the receipt
    } catch (e: any) {
      if (__DEV__) console.warn('[deposit] failed:', e);
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
