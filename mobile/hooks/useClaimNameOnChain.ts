import { useEffect, useRef } from 'react';
import { useBalance, useWriteContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { parseEther } from 'viem';
import { wagmiConfig } from '../providers/WagmiProvider';
import { useDisplayName } from './useDisplayName';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

const MIN_GAS = parseEther('0.001'); // Minimum ETH needed to claim name

export function useClaimNameOnChain(address: `0x${string}` | undefined) {
  const { data: balance } = useBalance({ address, chainId: sepolia.id });
  const { localName, onChainName } = useDisplayName(address);
  const { writeContractAsync } = useWriteContract();
  const claimingRef = useRef(false);

  useEffect(() => {
    if (!address || !localName || onChainName || claimingRef.current) return;
    if (!balance || balance.value < MIN_GAS) return;

    claimingRef.current = true;

    (async () => {
      try {
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
          abi: USERNAME_REGISTRY_ABI,
          functionName: 'claim',
          args: [localName.toLowerCase()],
        });

        await waitForTransactionReceipt(wagmiConfig, { hash });
        // On-chain claim successful — will be picked up by useDisplayName's on-chain read
      } catch (e) {
        if (__DEV__) console.warn('Failed to claim name on-chain:', e);
      } finally {
        claimingRef.current = false;
      }
    })();
  }, [address, localName, onChainName, balance?.value, writeContractAsync]);
}
