import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';
import type { CircleData } from '../hooks/useCircles';

function fmtUSDT(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function freqLabel(s: number) {
  const d = s / 86400;
  if (d === 7) return 'Weekly';
  if (d === 14) return 'Bi-weekly';
  if (d >= 28 && d <= 31) return 'Monthly';
  return `Every ${Math.round(d)}d`;
}

function nextLabel(ts: number) {
  const diff = ts - Date.now() / 1000;
  if (diff < 0) return 'Overdue';
  const d = Math.floor(diff / 86400);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `In ${d}d`;
}

export function CircleCard({ circle, onPress }: { circle: CircleData; onPress: () => void }) {
  const progress = circle.totalRounds > 0 ? circle.currentRound / circle.totalRounds : 0;
  const isMyTurn = circle.payoutPending && circle.myPosition === circle.currentRound + 1;

  const badgeVariant = isMyTurn
    ? 'yourTurn'
    : circle.status === 0
    ? 'recruiting'
    : circle.status === 2
    ? 'completed'
    : 'active';

  return (
    <TouchableOpacity
      className="bg-card rounded-2xl p-4 mb-3 border border-border shadow-sm"
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${circle.name} circle`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <Text className="text-primary font-black text-base">
              {circle.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-charcoal font-bold text-base" numberOfLines={1}>
              {circle.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Ionicons name="time-outline" size={11} color="#6B7C74" />
              <Text className="text-muted text-xs">{freqLabel(circle.frequency)}</Text>
              <Text className="text-muted text-xs">·</Text>
              <Ionicons name="cash-outline" size={11} color="#6B7C74" />
              <Text className="text-muted text-xs">${fmtUSDT(circle.contributionAmount)} USDT</Text>
            </View>
          </View>
        </View>
        <Badge variant={badgeVariant} size="sm" />
      </View>

      {/* Progress */}
      <View className="mb-3 gap-1.5">
        <View className="flex-row justify-between">
          <Text className="text-muted text-xs">Round {circle.currentRound}/{circle.totalRounds}</Text>
          <Text className="text-muted text-xs">{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} />
      </View>

      {/* Footer */}
      <View className="flex-row justify-between border-t border-border pt-3">
        <FooterStat icon="wallet-outline" label="Pool" value={`$${fmtUSDT(circle.poolBalance)}`} />
        <FooterStat icon="people-outline" label="Members" value={`${circle.members.length}/${circle.maxMembers}`} />
        <FooterStat icon="calendar-outline" label="Next payout" value={nextLabel(circle.nextPayoutTimestamp)} />
      </View>
    </TouchableOpacity>
  );
}

function FooterStat({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string;
}) {
  return (
    <View className="items-center gap-0.5">
      <View className="flex-row items-center gap-1">
        <Ionicons name={icon} size={11} color="#6B7C74" />
        <Text className="text-muted text-[10px] uppercase tracking-wide">{label}</Text>
      </View>
      <Text className="text-charcoal font-bold text-sm">{value}</Text>
    </View>
  );
}
