import { useState, useCallback } from 'react';
import type { TxState } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';
import { sendTx } from '../lib/sendTx';
import { publicClient } from '../lib/viemWalletClient';
import { withTimeout } from '../lib/withTimeout';

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

  const contribute = useCallback(async (params: ContributeParams) => {
    setTxState('signing');
    setError(null);
    setTxHash(null);
    try {
      const isNative = params.tokenIn === '0x0000000000000000000000000000000000000000';

      // Step 1: approve USDC spend, wait for confirmation
      if (!isNative) {
        const approveHash = await sendTx({
          address: params.tokenIn,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.AJO_CIRCLE, params.amountIn],
        });
        await withTimeout(
          publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 }),
          90_000, 'Approval confirmation',
        );
      }

      setTxState('confirming');

      // Step 2: contribute
      const hash = await sendTx({
        address: CONTRACT_ADDRESSES.AJO_CIRCLE,
        abi: AJO_CIRCLE_ABI,
        functionName: 'contribute',
        args: [BigInt(params.circleId), params.tokenIn, params.amountIn, params.amountOutMinimum, params.poolFee],
        value: isNative ? params.amountIn : undefined,
      });

      setTxHash(hash);
      setTxState('success');
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      let friendly = 'Transaction failed. Please try again.';
      if (msg.includes('TransferFrom') || msg.includes('transfer amount exceeds'))
        friendly = 'Insufficient USDC balance. Get USDC from faucet.circle.com';
      else if (msg.includes('Already contributed'))
        friendly = 'You have already contributed this round.';
      else if (msg.includes('Awaiting payout'))
        friendly = 'Waiting for the current payout to be claimed first.';
      else if (msg.includes('Not a member'))
        friendly = 'You are not a member of this circle.';
      else if (msg.includes('rejected') || msg.includes('cancel'))
        friendly = 'Transaction cancelled.';
      setError(friendly);
      setTxState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setTxState('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return { contribute, txState, txHash, error,
    isPending: txState === 'signing' || txState === 'confirming',
    isSuccess: txState === 'success', reset };
}
