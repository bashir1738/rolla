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
 * Reads every circle on-chain and returns the ones the connected wallet belongs
 * to. Returns an empty list when disconnected or when no circles exist.
 */
export function useCircles() {
  const { address } = useAccount();
  const { data: countData, isLoading: countLoading } = useCircleCount();
  const count = countData ? Number(countData) : 0;

  // Build a batched read: info + members + my-position for each circle.
  const contracts = useMemo(() => {
    if (!count || !address) return [];
    const calls: any[] = [];
    for (let id = 0; id < count; id++) {
      calls.push({ ...AJO, functionName: 'getCircleInfo', args: [BigInt(id)] });
      calls.push({ ...AJO, functionName: 'getMembers', args: [BigInt(id)] });
      calls.push({ ...AJO, functionName: 'getMemberPosition', args: [BigInt(id), address] });
    }
    return calls;
  }, [count, address]);

  const { data, isLoading: readsLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0, refetchInterval: 30_000 },
  });

  const circles = useMemo<CircleData[]>(() => {
    if (!data || !address) return [];
    const out: CircleData[] = [];
    for (let id = 0; id < count; id++) {
      const info = data[id * 3]?.result as any;
      const members = (data[id * 3 + 1]?.result as string[]) ?? [];
      const myPosition = Number((data[id * 3 + 2]?.result as bigint) ?? 0n);

      if (!info || myPosition === 0) continue; // only circles the user is in

      const [
        name, maxMembers, contributionAmount, currentRound, totalRounds,
        poolBalance, nextPayoutTimestamp, frequency, status, payoutPending, paidCount,
      ] = info as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, boolean, number];

      out.push({
        id,
        name,
        emoji: emojiFor(id),
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
    }
    return out;
  }, [data, count, address]);

  return { circles, isLoading: countLoading || readsLoading };
}

export function useCircle(circleId: number) {
  const { circles, isLoading } = useCircles();
  return { circle: circles.find((c) => c.id === circleId) ?? null, isLoading };
}
