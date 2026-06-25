import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';

export interface CircleData {
  id: number;
  name: string;
  emoji: string;
  maxMembers: number;
  contributionAmount: bigint;
  currentRound: number;
  totalRounds: number;
  poolBalance: bigint;
  nextPayoutTimestamp: number;
  frequency: number;
  status: 0 | 1 | 2;
  payoutPending: boolean;
  paidCount: number;
  members: string[];
  myPosition: number;
}

// Emoji is not stored on-chain; derive a stable one from the circle id so each
// circle has a consistent visual identity.
const CIRCLE_EMOJIS = ['💼', '👑', '🌿', '🎯', '🔥', '💎', '🚀', '🌟', '🏆', '💪'];
const emojiFor = (id: number) => CIRCLE_EMOJIS[id % CIRCLE_EMOJIS.length];

const AJO = { address: CONTRACT_ADDRESSES.AJO_CIRCLE, abi: AJO_CIRCLE_ABI } as const;

export function useCircleCount() {
  return useReadContract({
    ...AJO,
    functionName: 'circleCount',
    query: { refetchInterval: 30_000 },
  });
}

/**
 * Reads the circles the connected wallet belongs to using getUserCircles(),
 * then batch-fetches info for each one. Works with dynamic 6-digit circle IDs.
 */
export function useCircles() {
  const { address } = useAccount();

  // Fetch the list of circle IDs this wallet is in
  const { data: idsData, isLoading: idsLoading } = useReadContract({
    ...AJO,
    functionName: 'getUserCircles',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const ids = useMemo(() => (idsData as bigint[] | undefined) ?? [], [idsData]);

  // Batch fetch info + members for each circle ID
  const contracts = useMemo(() => {
    if (!ids.length || !address) return [];
    const calls: any[] = [];
    for (const id of ids) {
      calls.push({ ...AJO, functionName: 'getCircleInfo', args: [id] });
      calls.push({ ...AJO, functionName: 'getMembers', args: [id] });
      calls.push({ ...AJO, functionName: 'getMemberPosition', args: [id, address] });
    }
    return calls;
  }, [ids, address]);

  const { data, isLoading: readsLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0, refetchInterval: 30_000 },
  });

  const circles = useMemo<CircleData[]>(() => {
    if (!data || !address) return [];
    const out: CircleData[] = [];
    ids.forEach((id, i) => {
      const info = data[i * 3]?.result as any;
      const members = (data[i * 3 + 1]?.result as string[]) ?? [];
      const myPosition = Number((data[i * 3 + 2]?.result as bigint) ?? 0n);

      if (!info) return;

      const [
        name, maxMembers, contributionAmount, currentRound, totalRounds,
        poolBalance, nextPayoutTimestamp, frequency, status, payoutPending, paidCount,
      ] = info as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, boolean, number];

      out.push({
        id: Number(id),
        name,
        emoji: emojiFor(Number(id)),
        maxMembers: Number(maxMembers),
        contributionAmount,
        currentRound: Number(currentRound),
        totalRounds: Number(totalRounds),
        poolBalance,
        nextPayoutTimestamp: Number(nextPayoutTimestamp),
        frequency: Number(frequency),
        status: Number(status) as 0 | 1 | 2,
        payoutPending,
        paidCount: Number(paidCount),
        members,
        myPosition,
      });
    });
    return out;
  }, [data, ids, address]);

  return { circles, isLoading: idsLoading || readsLoading };
}

/**
 * useOpenCircles is intentionally removed — with dynamic circle IDs we can't
 * enumerate all circles without an indexer. Discovery is done via Join by ID.
 */
export function useOpenCircles() {
  return { openCircles: [] as CircleData[], isLoading: false };
}

export function useCircle(circleId: number) {
  const { circles, isLoading } = useCircles();
  return { circle: circles.find((c) => c.id === circleId) ?? null, isLoading };
}
