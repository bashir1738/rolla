import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { ROLLA_VAULT_ABI } from '../constants/abis';

export type VaultTier = 'Flex' | 'Growth' | 'Power';

export const VAULT_TIERS = {
  Flex:   { tier: 0 as const, aprBps: 450,  lockDays: 0,   minUSDT: 10,  icon: 'water-outline',   label: 'Flex' },
  Growth: { tier: 1 as const, aprBps: 920,  lockDays: 90,  minUSDT: 100, icon: 'leaf-outline',    label: 'Growth' },
  Power:  { tier: 2 as const, aprBps: 1480, lockDays: 365, minUSDT: 500, icon: 'flash-outline',   label: 'Power' },
} as const;

export interface VaultData {
  id: number;
  owner: string;
  tier: 0 | 1 | 2;
  principalUSDT: bigint;
  currentBalanceUSDT: bigint;
  depositTimestamp: number;
  maturityTimestamp: number;
  lockDuration: number;
  claimed: boolean;
  isMatured: boolean;
}

const VAULT = { address: CONTRACT_ADDRESSES.ROLLA_VAULT, abi: ROLLA_VAULT_ABI } as const;

/**
 * Reads the connected wallet's vaults on-chain. Returns an empty list when
 * disconnected or when the user has no vaults.
 */
export function useVaults() {
  const { address } = useAccount();

  const { data: idsData, isLoading: idsLoading } = useReadContract({
    ...VAULT,
    functionName: 'getUserVaults',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const ids = useMemo(() => (idsData as bigint[] | undefined) ?? [], [idsData]);

  // For each vault id: struct + live balance + maturity flag.
  const contracts = useMemo(() => {
    const calls: any[] = [];
    for (const id of ids) {
      calls.push({ ...VAULT, functionName: 'vaults', args: [id] });
      calls.push({ ...VAULT, functionName: 'getVaultBalance', args: [id] });
      calls.push({ ...VAULT, functionName: 'isMatured', args: [id] });
    }
    return calls;
  }, [ids]);

  const { data, isLoading: readsLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0, refetchInterval: 30_000 },
  });

  const vaults = useMemo<VaultData[]>(() => {
    if (!data) return [];
    const out: VaultData[] = [];
    ids.forEach((id, i) => {
      const v = data[i * 3]?.result as any;
      const balance = (data[i * 3 + 1]?.result as bigint) ?? 0n;
      const matured = Boolean(data[i * 3 + 2]?.result);
      if (!v) return;

      const [owner, tier, principalUSDT, , depositTimestamp, maturityTimestamp, lockDuration, claimed] =
        v as [string, number, bigint, bigint, bigint, bigint, bigint, boolean];

      if (claimed) return; // hide claimed vaults

      out.push({
        id: Number(id),
        owner,
        tier: Number(tier) as 0 | 1 | 2,
        principalUSDT,
        currentBalanceUSDT: balance,
        depositTimestamp: Number(depositTimestamp),
        maturityTimestamp: Number(maturityTimestamp),
        lockDuration: Number(lockDuration),
        claimed,
        isMatured: matured,
      });
    });
    return out;
  }, [data, ids]);

  return { vaults, isLoading: idsLoading || readsLoading };
}
