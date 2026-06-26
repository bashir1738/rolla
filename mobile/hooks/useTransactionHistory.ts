import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI, ROLLA_VAULT_ABI } from '../constants/abis';
import type { Transaction } from '../components/TransactionItem';

export function useTransactionHistory(address: `0x${string}` | undefined) {
  const client = usePublicClient();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || !client) return;
    setIsLoading(true);
    try {
      const fromBlock = BigInt(0);

      const [contributions, payouts, deposits, claims, circlesCreated, circlesJoined] = await Promise.all([
        client.getLogs({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          event: (AJO_CIRCLE_ABI as unknown as any[]).find((e) => e.name === 'ContributionMade'),
          args: { member: address },
          fromBlock,
        }).catch(() => []),
        client.getLogs({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          event: (AJO_CIRCLE_ABI as unknown as any[]).find((e) => e.name === 'PayoutReleased'),
          args: { recipient: address },
          fromBlock,
        }).catch(() => []),
        client.getLogs({
          address: CONTRACT_ADDRESSES.ROLLA_VAULT,
          event: (ROLLA_VAULT_ABI as unknown as any[]).find((e) => e.name === 'VaultCreated'),
          args: { owner: address },
          fromBlock,
        }).catch(() => []),
        client.getLogs({
          address: CONTRACT_ADDRESSES.ROLLA_VAULT,
          event: (ROLLA_VAULT_ABI as unknown as any[]).find((e) => e.name === 'VaultClaimed'),
          args: { owner: address },
          fromBlock,
        }).catch(() => []),
        client.getLogs({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          event: (AJO_CIRCLE_ABI as unknown as any[]).find((e) => e.name === 'CircleCreated'),
          args: { creator: address },
          fromBlock,
        }).catch(() => []),
        client.getLogs({
          address: CONTRACT_ADDRESSES.AJO_CIRCLE,
          event: (AJO_CIRCLE_ABI as unknown as any[]).find((e) => e.name === 'MemberJoined'),
          args: { member: address },
          fromBlock,
        }).catch(() => []),
      ]);

      // Fetch block timestamps for all unique blocks
      const blockNums = new Set([
        ...contributions.map((l: any) => l.blockNumber),
        ...payouts.map((l: any) => l.blockNumber),
        ...deposits.map((l: any) => l.blockNumber),
        ...claims.map((l: any) => l.blockNumber),
        ...circlesCreated.map((l: any) => l.blockNumber),
        ...circlesJoined.map((l: any) => l.blockNumber),
      ]);
      const blockTimes = new Map<bigint, Date>();
      await Promise.all(
        [...blockNums].map(async (bn) => {
          try {
            const block = await client.getBlock({ blockNumber: bn as bigint });
            blockTimes.set(bn as bigint, new Date(Number(block.timestamp) * 1000));
          } catch {}
        }),
      );

      const result: Transaction[] = [];

      for (const log of circlesCreated as any[]) {
        const { circleId, name } = log.args ?? {};
        result.push({
          id: `created-${log.transactionHash}-${log.logIndex}`,
          type: 'circle_create',
          label: `Created circle: ${name ?? '?'}`,
          subLabel: `Circle #${circleId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: 0n,
          txHash: log.transactionHash,
        });
      }

      // MemberJoined fires for both createCircle and joinCircle — skip ones
      // already covered by CircleCreated (same tx hash).
      const createdTxHashes = new Set((circlesCreated as any[]).map((l: any) => l.transactionHash));
      for (const log of circlesJoined as any[]) {
        if (createdTxHashes.has(log.transactionHash)) continue;
        const { circleId } = log.args ?? {};
        result.push({
          id: `joined-${log.transactionHash}-${log.logIndex}`,
          type: 'circle_join',
          label: `Joined circle`,
          subLabel: `Circle #${circleId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: 0n,
          txHash: log.transactionHash,
        });
      }

      for (const log of contributions as any[]) {
        const { circleId, usdcAmount } = log.args ?? {};
        result.push({
          id: `contrib-${log.transactionHash}-${log.logIndex}`,
          type: 'contribution',
          label: `Circle contribution`,
          subLabel: `Circle #${circleId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: BigInt(usdcAmount ?? 0),
          txHash: log.transactionHash,
        });
      }

      for (const log of payouts as any[]) {
        const { circleId, amount } = log.args ?? {};
        result.push({
          id: `payout-${log.transactionHash}-${log.logIndex}`,
          type: 'payout',
          label: `Circle payout`,
          subLabel: `Circle #${circleId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: BigInt(amount ?? 0),
          txHash: log.transactionHash,
        });
      }

      for (const log of deposits as any[]) {
        const { vaultId, usdcDeposited } = log.args ?? {};
        const tierNames = ['Flex', 'Growth', 'Power'];
        const tier = log.args?.tier ?? 0;
        result.push({
          id: `vault-${log.transactionHash}-${log.logIndex}`,
          type: 'deposit',
          label: `${tierNames[Number(tier)] ?? 'Vault'} vault deposit`,
          subLabel: `Vault #${vaultId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: BigInt(usdcDeposited ?? 0),
          txHash: log.transactionHash,
        });
      }

      for (const log of claims as any[]) {
        const { vaultId, usdcValue } = log.args ?? {};
        result.push({
          id: `claim-${log.transactionHash}-${log.logIndex}`,
          type: 'claim',
          label: `Vault claim`,
          subLabel: `Vault #${vaultId?.toString() ?? '?'}`,
          date: blockTimes.get(log.blockNumber) ?? new Date(),
          amountUSDC: BigInt(usdcValue ?? 0),
          txHash: log.transactionHash,
        });
      }

      result.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTxs(result);
    } catch (e) {
      if (__DEV__) console.warn('[txHistory]', e);
    } finally {
      setIsLoading(false);
    }
  }, [address, client]);

  useEffect(() => { fetch(); }, [fetch]);

  return { txs, isLoading, refresh: fetch };
}
