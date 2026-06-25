import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';
import { VAULT_TIERS, type VaultData } from '../hooks/useVaults';

function fmtUSDC(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeLeft(ts: number) {
  const d = ts - Date.now() / 1000;
  if (d <= 0) return 'Matured';
  const days = Math.floor(d / 86400);
  return days === 0 ? `${Math.floor(d / 3600)}h remaining` : `${days}d remaining`;
}

function lockPct(v: VaultData) {
  if (v.lockDuration === 0) return 1;
  return Math.min(1, (Date.now() / 1000 - v.depositTimestamp) / v.lockDuration);
}

export function VaultCard({ vault, onClaim }: { vault: VaultData; onClaim: () => void }) {
  const tier = VAULT_TIERS[(['Flex', 'Growth', 'Power'] as const)[vault.tier]];
  const earned = vault.currentBalanceUSDC - vault.principalUSDC;
  const pct = lockPct(vault);

  return (
    <View className="bg-card rounded-2xl p-4 mb-3 border border-border shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
            <Ionicons name={tier.icon as any} size={22} color="#1A3C2B" />
          </View>
          <View>
            <Text className="text-charcoal font-bold text-base">{tier.label} Vault</Text>
            <Text className="text-muted text-xs">{(tier.aprBps / 100).toFixed(1)}% APR target</Text>
          </View>
        </View>
        <Badge variant={vault.isMatured ? 'matured' : 'locked'} size="sm" />
      </View>

      {/* Amounts */}
      <View className="flex-row justify-between bg-surface rounded-xl p-3 mb-4">
        <View>
          <Text className="text-muted text-[10px] uppercase tracking-wide mb-1">Current Balance</Text>
          <Text className="text-charcoal font-black text-lg">${fmtUSDC(vault.currentBalanceUSDC)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-muted text-[10px] uppercase tracking-wide mb-1">Earned</Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="trending-up" size={14} color="#1A3C2B" />
            <Text className="text-primary font-black text-lg">+${fmtUSDC(earned)}</Text>
          </View>
        </View>
      </View>

      {/* Lock progress */}
      {vault.lockDuration > 0 && (
        <View className="gap-1.5 mb-4">
          <View className="flex-row justify-between">
            <View className="flex-row items-center gap-1">
              {vault.isMatured && <Ionicons name="checkmark" size={12} color="#16A34A" />}
              <Text className="text-muted text-xs">
                {vault.isMatured ? 'Matured' : timeLeft(vault.maturityTimestamp)}
              </Text>
            </View>
            <Text className="text-muted text-xs">{Math.round(pct * 100)}%</Text>
          </View>
          <ProgressBar progress={pct} color={vault.isMatured ? '#4ADE80' : '#D4A017'} />
        </View>
      )}

      {/* Claim button */}
      {vault.isMatured && !vault.claimed && (
        <TouchableOpacity
          className="bg-primary rounded-full py-3.5 items-center flex-row justify-center gap-2"
          onPress={onClaim}
          accessibilityLabel={`Claim ${tier.label} vault`}
        >
          <Ionicons name="cash-outline" size={18} color="white" />
          <Text className="text-white font-bold text-base">
            Claim ${fmtUSDC(vault.currentBalanceUSDC)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
