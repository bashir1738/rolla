import { useState, useEffect } from 'react';

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

const ETH_USDT_RATE = 3640; // mock ETH price in USDT

export function useQuote(params: QuoteParams): QuoteResult {
  const [amountOut, setAmountOut] = useState(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tokenIn, tokenOut, amountIn, fee, enabled = true } = params;

  useEffect(() => {
    if (!enabled || amountIn === 0n) {
      setAmountOut(0n);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Replace with IQuoterV2.quoteExactInputSingle call via wagmi readContract:
    // const result = await readContract({ address: UNISWAP_QUOTER, abi: QUOTER_ABI,
    //   functionName: 'quoteExactInputSingle',
    //   args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0 }] });

    const timer = setTimeout(() => {
      // Mock: ETH (1e18) → USDT (6 dec), rate ~3640
      const isEthIn = tokenIn === '0x0000000000000000000000000000000000000000';
      const isUsdtIn = tokenIn.toLowerCase().includes('716');
      let out = 0n;
      if (isEthIn) {
        out = (amountIn * BigInt(ETH_USDT_RATE) * 1_000000n) / BigInt(1e18);
      } else if (isUsdtIn) {
        out = (amountIn * BigInt(1e18)) / (BigInt(ETH_USDT_RATE) * 1_000000n);
      } else {
        out = (amountIn * 95n) / 100n; // 5% slippage mock
      }
      setAmountOut(out);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [tokenIn, tokenOut, amountIn.toString(), fee, enabled]);

  return { amountOut, isLoading, error };
}
