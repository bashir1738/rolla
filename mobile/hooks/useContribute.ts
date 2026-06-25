import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits } from 'viem';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES, TOKEN_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';
import { wagmiConfig } from '../providers/WagmiProvider';

// ERC20 minimal ABI for approval
const ERC20_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
] as const;

interface ContributeParams {
  circleId: number;
  tokenIn: `0x${string}`;
  amountIn: bigint;
  amountOutMinimum: bigint;
  poolFee: number;
}

export function useContribute() {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const contribute = useCallback(async (params: ContributeParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';
      const isUSDC = params.tokenIn.toLowerCase() === TOKEN_ADDRESSES.USDC.toLowerCase();

      // Step 1: Approve then wait for receipt before contract calls transferFrom
      if (!isNative) {
        const spender = isUSDC ? TOKEN_ADDRESSES.USDC : params.tokenIn;
        const approveHash = await writeContractAsync({
          address: spender,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.AJO_CIRCLE, params.amountIn],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      setTxState('confirming');

      // Step 2: Contribute
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.AJO_CIRCLE,
        abi: AJO_CIRCLE_ABI,
        functionName: 'contribute',
        args: [
          BigInt(params.circleId),
          params.tokenIn,
          params.amountIn,
          params.amountOutMinimum,
          params.poolFee,
        ],
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
  }, []);

  return {
    contribute,
    txState,
    txHash,
    error,
    isPending: txState === 'signing' || txState === 'confirming',
    isSuccess: txState === 'success',
    reset,
  };
}
