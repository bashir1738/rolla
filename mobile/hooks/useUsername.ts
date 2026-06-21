import { useCallback, useEffect, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../providers/WagmiProvider';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

export type ClaimState = 'idle' | 'signing' | 'confirming' | 'success' | 'error';

/** Standalone — safe to call outside a hook context */
export async function checkNameAvailable(name: string): Promise<boolean> {
  if (!name.trim()) return false;
  try {
    return (await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
      abi: USERNAME_REGISTRY_ABI,
      functionName: 'available',
      args: [name.trim()],
    })) as boolean;
  } catch {
    return false;
  }
}

function friendlyError(err: any): string {
  const msg: string = err?.shortMessage ?? err?.message ?? '';
  if (msg.includes('User rejected') || msg.includes('user rejected')) return "You cancelled — tap below to try again";
  if (msg.includes('NameTaken')) return "That name was just taken — try another";
  if (msg.includes('InvalidName')) return "Name has invalid characters";
  if (msg.includes('insufficient funds')) return "Not enough ETH for gas fees";
  return msg || 'Something went wrong — please try again';
}

export function useUsername(address?: `0x${string}`) {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: raw, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
    abi: USERNAME_REGISTRY_ABI,
    functionName: 'nameOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const onChainName = typeof raw === 'string' && raw.length > 0 ? raw : null;

  const { isPending: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (isConfirming) setClaimState('confirming');
  }, [isConfirming]);

  useEffect(() => {
    if (txSuccess) {
      setClaimState('success');
      refetch();
    }
  }, [txSuccess]);

  const { writeContractAsync } = useWriteContract();

  const claim = useCallback(async (name: string) => {
    setClaimError(null);
    setClaimState('signing');
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
        abi: USERNAME_REGISTRY_ABI,
        functionName: 'claim',
        args: [name.trim()],
      });
      setTxHash(hash);
    } catch (err: any) {
      setClaimError(friendlyError(err));
      setClaimState('error');
    }
  }, [writeContractAsync]);

  const release = useCallback(async () => {
    setClaimError(null);
    setClaimState('signing');
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
        abi: USERNAME_REGISTRY_ABI,
        functionName: 'release',
      });
      setTxHash(hash);
    } catch (err: any) {
      setClaimError(friendlyError(err));
      setClaimState('error');
    }
  }, [writeContractAsync]);

  const reset = useCallback(() => {
    setClaimState('idle');
    setClaimError(null);
    setTxHash(undefined);
  }, []);

  return { onChainName, claimState, claimError, txHash, claim, release, reset };
}
