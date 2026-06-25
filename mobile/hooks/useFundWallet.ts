import { useEffect, useState, useRef } from 'react';
import { useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || 'http://localhost:3000';
const FUND_THRESHOLD = parseEther('0.005'); // Fund if below 0.005 ETH
const FUND_AMOUNT = parseEther('0.01'); // Send 0.01 ETH

export function useFundWallet(address: `0x${string}` | undefined) {
  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
  });

  const [isFunding, setIsFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const fundingRef = useRef(false);

  useEffect(() => {
    if (!address || !balance || fundingRef.current) return;

    // If balance is below threshold, request funding
    if (balance.value < FUND_THRESHOLD) {
      fundingRef.current = true;
      setIsFunding(true);
      setFundingError(null);

      fetch(`${BACKEND_URL}/api/fund-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setFundingError(data.error);
          }
          // Success — balance will update automatically from wagmi
        })
        .catch((err) => {
          setFundingError(err.message);
        })
        .finally(() => {
          setIsFunding(false);
        });
    }
  }, [address, balance?.value]);

  return { isFunding, fundingError };
}
