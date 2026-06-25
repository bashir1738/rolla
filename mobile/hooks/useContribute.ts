import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits } from 'viem';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';
import { wagmiConfig } from '../providers/WagmiProvider';
import { useAuth } from '../contexts/AuthContext';

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

  const { requireAuth } = useAuth();
  const { writeContractAsync } = useWriteContract();

  const contribute = useCallback(async (params: ContributeParams) => {
    const authed = await requireAuth();
    if (!authed) return;

    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';

      // Step 1: Approve the circle contract to spend the token, then wait for
      // the tx to mine so the allowance is set before contribute runs.
      if (!isNative) {
        const approveHash = await writeContractAsync({
          address: params.tokenIn,
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
      const msg: string = e?.message ?? '';
      let friendly = 'Transaction failed. Please try again.';
      if (msg.includes('TransferFrom failed') || msg.includes('transfer amount exceeds balance'))
        friendly = 'Insufficient USDC balance. Get USDC from faucet.circle.com';
      else if (msg.includes('Already contributed'))
        friendly = 'You have already contributed this round.';
      else if (msg.includes('Awaiting payout'))
        friendly = 'Waiting for the current payout to be claimed first.';
      else if (msg.includes('Not a member'))
        friendly = 'You are not a member of this circle.';
      else if (msg.includes('user rejected'))
        friendly = 'Transaction cancelled.';
      setError(friendly);
      setTxState('error');
    }
  }, [writeContractAsync, requireAuth]);

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
