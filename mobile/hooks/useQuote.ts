import { useState, useEffect } from 'react';
import { simulateContract } from 'wagmi/actions';
import { sepolia } from 'wagmi/chains';
import { wagmiConfig } from '../providers/WagmiProvider';
import { PROTOCOL_ADDRESSES, TOKEN_ADDRESSES } from '../constants/addresses';
import { QUOTER_V2_ABI } from '../constants/abis';

interface QuoteParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  fee: number;
  enabled?: boolean;
}

interface QuoteResult {
  amountOut: bigint;
  isLoading: boolean;
  error: string | null;
}

// Uniswap V3 only routes through ERC-20 tokens — map native ETH to WETH.
const NATIVE_ETH = '0x0000000000000000000000000000000000000000';
function toERC20(addr: string): `0x${string}` {
  return addr === NATIVE_ETH
    ? TOKEN_ADDRESSES.WETH
    : (addr as `0x${string}`);
}

// Dummy sender so eth_call simulation works when wallet is not connected.
const DUMMY_ACCOUNT = '0x0000000000000000000000000000000000000001' as const;

export function useQuote(params: QuoteParams): QuoteResult {
  const [amountOut, setAmountOut] = useState(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tokenIn, tokenOut, amountIn, fee, enabled = true } = params;

  useEffect(() => {
    if (!enabled || amountIn === 0n) {
      setAmountOut(0n);
      setIsLoading(false);
      return;
    }

    // Same-token: no swap needed, output equals input.
    const inAddr  = tokenIn.toLowerCase();
    const outAddr = tokenOut.toLowerCase();
    const sameToken =
      inAddr === outAddr ||
      (inAddr  === NATIVE_ETH          && outAddr === TOKEN_ADDRESSES.WETH.toLowerCase()) ||
      (outAddr === NATIVE_ETH          && inAddr  === TOKEN_ADDRESSES.WETH.toLowerCase());

    if (sameToken) {
      setAmountOut(amountIn);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    simulateContract(wagmiConfig, {
      address: PROTOCOL_ADDRESSES.UNISWAP_QUOTER,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      account: DUMMY_ACCOUNT,
      chainId: sepolia.id,
      args: [{
        tokenIn:           toERC20(tokenIn),
        tokenOut:          toERC20(tokenOut),
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n,
      }],
    })
      .then(({ result }) => {
        if (!cancelled) {
          setAmountOut(result[0]); // result[0] = amountOut
          setIsLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg = (e as { shortMessage?: string; message?: string })?.shortMessage
            ?? (e as Error)?.message
            ?? 'Quote unavailable';
          setError(msg);
          setAmountOut(0n);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  // amountIn.toString() avoids bigint reference equality re-fires
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, amountIn.toString(), fee, enabled]);

  return { amountOut, isLoading, error };
}
