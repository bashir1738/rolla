import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VaultCard } from '../../components/VaultCard';
import { DepositModal } from '../../components/DepositModal';
import { PayoutSheet } from '../../components/PayoutSheet';
import { useVaults, type VaultData } from '../../hooks/useVaults';
import { useWallet } from '../../providers/WalletContext';
import { VAULT_TIERS, type VaultTier } from '../../hooks/useVaults';

const TIER_KEYS: VaultTier[] = ['Flex', 'Growth', 'Power'];
const TIER_DESCS: Record<VaultTier, string> = {
  Flex:   'No lock · Min 10 USDT',
  Growth: '90-day lock · Min 100 USDT',
  Power:  '365-day lock · Min 500 USDT',
};

export default function SaveTab() {
  const { isConnected } = useWallet();
  const { vaults, isLoading } = useVaults();
  const [depositTier, setDepositTier] = useState<VaultTier | null>(null);
  const [claimVault, setClaimVault] = useState<VaultData | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="bg-primary px-5 pt-3 pb-6">
        <Text className="text-white text-2xl font-black">Save & Earn</Text>
        <Text className="text-white/60 text-sm mt-1">Deposit any token · Earn Aave yield</Text>
      </View>

      <ScrollView
        className="flex-1 bg-surface rounded-t-3xl"
        contentContainerClassName="px-4 pt-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Tier cards */}
        <View className="flex-row items-center gap-2 mb-3">
          <Ionicons name="layers-outline" size={14} color="#6B7C74" />
          <Text className="text-muted text-xs font-bold uppercase tracking-wider">Choose a vault tier</Text>
        </View>

        {TIER_KEYS.map((key) => {
          const t = VAULT_TIERS[key];
          const isPopular = key === 'Growth';
          return (
            <View key={key} className="bg-card rounded-2xl p-4 mb-3 border border-border ">
              {isPopular && (
                <View className="absolute top-0 right-4 bg-accent px-2.5 py-0.5 rounded-b-lg">
                  <Text className="text-primary text-[11px] font-bold">Popular</Text>
                </View>
              )}
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
                  <Ionicons name={t.icon as any} size={24} color="#1A3C2B" />
                </View>
                <View className="flex-1">
                  <Text className="text-charcoal font-bold text-base">{key} Vault</Text>
                  <Text className="text-primary font-black text-xl">{(t.aprBps / 100).toFixed(1)}% APR</Text>
                  <Text className="text-muted text-xs">{TIER_DESCS[key]}</Text>
                </View>
                <TouchableOpacity
                  className="bg-primary px-4 py-2.5 rounded-full"
                  onPress={() => setDepositTier(key)}
                  accessibilityLabel={`Deposit into ${key} vault`}
                >
                  <Text className="text-white font-bold text-sm">Deposit</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* How it works strip */}
        <View className="bg-primary/5 border border-primary/15 rounded-2xl p-4 mb-5">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="information-circle-outline" size={16} color="#1A3C2B" />
            <Text className="text-primary font-semibold text-sm">How it works</Text>
          </View>
          <Text className="text-muted text-xs leading-5">
            Your deposit is converted to USDT and supplied to Aave V3. Yield accrues automatically.
            Claim anytime (Flex) or after the lock period (Growth/Power).
          </Text>
        </View>

        {/* Active vaults */}
        {isConnected && (
          <>
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="briefcase-outline" size={14} color="#6B7C74" />
              <Text className="text-muted text-xs font-bold uppercase tracking-wider">Your Active Vaults</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color="#1A3C2B" />
            ) : vaults.length === 0 ? (
              <View className="items-center py-8 gap-2">
                <Ionicons name="wallet-outline" size={40} color="#8FA98C" />
                <Text className="text-muted text-sm">No active vaults yet</Text>
              </View>
            ) : (
              vaults.map((v) => <VaultCard key={v.id} vault={v} onClaim={() => setClaimVault(v)} />)
            )}
          </>
        )}
      </ScrollView>

      {depositTier && (
        <DepositModal tier={depositTier} visible={!!depositTier} onClose={() => setDepositTier(null)} />
      )}
      {claimVault && (
        <PayoutSheet
          target={{
            type: 'vault',
            vaultId: claimVault.id,
            availableUSDT: claimVault.currentBalanceUSDT,
            label: `${(['Flex', 'Growth', 'Power'] as const)[claimVault.tier]} Vault #${claimVault.id}`,
          }}
          visible={!!claimVault}
          onClose={() => setClaimVault(null)}
        />
      )}
    </SafeAreaView>
  );
}
