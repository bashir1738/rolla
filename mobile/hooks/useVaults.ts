import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { ROLLA_VAULT_ABI } from '../constants/abis';
import { sepolia } from 'wagmi/chains';

export type VaultTier = 'Flex' | 'Growth' | 'Power';

// Fallback values (used until on-chain data loads).
export const VAULT_TIERS = {
  Flex:   { tier: 0 as const, aprBps: 450,  lockDays: 0,   minUSDC: 10,  icon: 'water-outline',   label: 'Flex' },
  Growth: { tier: 1 as const, aprBps: 920,  lockDays: 90,  minUSDC: 100, icon: 'leaf-outline',    label: 'Growth' },
  Power:  { tier: 2 as const, aprBps: 1480, lockDays: 365, minUSDC: 500, icon: 'flash-outline',   label: 'Power' },
} as const;

const TIERS = [0, 1, 2] as const;
const TIER_KEYS: VaultTier[] = ['Flex', 'Growth', 'Power'];

/**
 * Reads minDeposits, lockDurations, and aprBps from the deployed RollaVault
 * contract so the UI stays in sync with on-chain values after redeployment.
 */
export function useVaultTiersFromChain() {
  const VAULT_REF = { address: CONTRACT_ADDRESSES.ROLLA_VAULT, abi: ROLLA_VAULT_ABI } as const;

  const contracts = useMemo(() => TIERS.flatMap((t) => [
    { ...VAULT_REF, functionName: 'minDeposits',   args: [BigInt(t)] },
    { ...VAULT_REF, functionName: 'lockDurations',  args: [BigInt(t)] },
    { ...VAULT_REF, functionName: 'aprBps',          args: [BigInt(t)] },
  ]), []);

  const { data } = useReadContracts({ contracts, query: { staleTime: 300_000 } });

  return useMemo(() => {
    if (!data) return VAULT_TIERS;
    type Mutable = { tier: 0|1|2; aprBps: number; lockDays: number; minUSDC: number; icon: string; label: string };
    const result: Record<VaultTier, Mutable> = {
      Flex:   { ...VAULT_TIERS.Flex },
      Growth: { ...VAULT_TIERS.Growth },
      Power:  { ...VAULT_TIERS.Power },
    };
    TIERS.forEach((t) => {
      const min  = data[t * 3]?.result as bigint | undefined;
      const lock = data[t * 3 + 1]?.result as bigint | undefined;
      const apr  = data[t * 3 + 2]?.result as bigint | undefined;
      const key  = TIER_KEYS[t];
      if (min)  result[key].minUSDC  = Number(min)  / 1_000_000;
      if (lock) result[key].lockDays = Number(lock) / 86_400;
      if (apr)  result[key].aprBps   = Number(apr);
    });
    return result as unknown as typeof VAULT_TIERS;
  }, [data]);
}

export interface VaultData {
  id: number;
  owner: string;
  tier: 0 | 1 | 2;
  principalUSDC: bigint;
  currentBalanceUSDC: bigint;
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

      const [owner, tier, principalUSDC, , depositTimestamp, maturityTimestamp, lockDuration, claimed] =
        v as [string, number, bigint, bigint, bigint, bigint, bigint, boolean];

      if (claimed) return; // hide claimed vaults

      out.push({
        id: Number(id),
        owner,
        tier: Number(tier) as 0 | 1 | 2,
        principalUSDC,
        currentBalanceUSDC: balance,
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
