import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WalletButton } from '../../components/WalletButton';
import { CircleCard } from '../../components/CircleCard';
import { CircleDetail } from '../../components/CircleDetail';
import { useCircles, type CircleData } from '../../hooks/useCircles';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName } from '../../hooks/useDisplayName';

function fmtUSDT(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function HomeTab() {
  const router = useRouter();
  const { isConnected, connect, address } = useWallet();
  const { display } = useDisplayName(address);
  const { circles, isLoading } = useCircles();
  const [selected, setSelected] = React.useState<CircleData | null>(null);

  const totalSaved = circles.reduce((s, c) => s + c.poolBalance, 0n);
  const pendingPayouts = circles.filter((c) => c.payoutPending && c.myPosition === c.currentRound + 1);
  const activeCount = circles.filter((c) => c.status === 1).length;

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-start px-5 pt-4 pb-2">
        <View>
          <Text className="text-white text-lg font-bold">Hello, {display}</Text>
          <Text className="text-white/60 text-sm mt-0.5">Your savings, on your terms</Text>
        </View>
        <View className="flex-row items-center gap-3">
          
          <WalletButton />
        </View>
      </View>

      {/* Balance Card */}
      <View className="mx-4 mb-3  p-5 ">
        <Text className="text-white/70 text-xs uppercase tracking-widest mb-1">Total in Circles</Text>
        <Text className="text-white text-3xl font-black mb-3">${fmtUSDT(totalSaved)} USDT</Text>
        <View className="flex-row gap-4">
          <StatPill count={activeCount} label="active" color="#4ADE80" />
          <StatPill count={pendingPayouts.length} label="payout" color="#D4A017" />
          <StatPill count={circles.length} label="circles" color="rgba(255,255,255,0.6)" />
        </View>
      </View>

      {/* Main scroll area */}
      <ScrollView
        className="flex-1 bg-surface rounded-t-3xl"
        contentContainerClassName="px-4 pt-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Payout alert */}
        {pendingPayouts.length > 0 && (
          <TouchableOpacity
            className="bg-accent/20 border border-accent/40 rounded-2xl p-4 mb-4"
            onPress={() => setSelected(pendingPayouts[0])}
            accessibilityLabel="Claim your payout"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="gift-outline" size={18} color="#D4A017" />
              <Text className="text-charcoal font-semibold text-sm flex-1">
                Your payout is ready — claim ${fmtUSDT(pendingPayouts[0].poolBalance)} USDT from{' '}
                {pendingPayouts[0].name}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Circles section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-charcoal text-base font-bold">Your Circles</Text>
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => router.push('/(tabs)/circles')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#1A3C2B" />
            <Text className="text-primary font-bold text-sm">New</Text>
          </TouchableOpacity>
        </View>

        {!isConnected ? (
          <View className="items-center py-10 gap-3">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
              <Ionicons name="wallet-outline" size={30} color="#1A3C2B" />
            </View>
            <Text className="text-charcoal font-bold text-base">Connect your wallet</Text>
            <Text className="text-muted text-sm text-center px-6">
              Connect to view your savings circles and start earning.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-full px-6 py-3 mt-1"
              onPress={connect}
            >
              <Text className="text-white font-bold">Connect Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View className="py-10 items-center">
            <ActivityIndicator color="#1A3C2B" />
          </View>
        ) : circles.length === 0 ? (
          <View className="items-center py-10 gap-3">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
              <Ionicons name="people-circle-outline" size={32} color="#1A3C2B" />
            </View>
            <Text className="text-charcoal font-bold text-base">No circles yet</Text>
            <Text className="text-muted text-sm text-center px-6">
              Create a savings circle or join one to get started.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-full px-6 py-3 mt-1"
              onPress={() => router.push('/(tabs)/circles')}
            >
              <Text className="text-white font-bold">Create a circle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          circles.map((c) => (
            <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
          ))
        )}

        {/* Vault teaser */}
        <TouchableOpacity
          className="flex-row items-center bg-primary/5 border border-primary/20 rounded-2xl p-4 my-4"
          onPress={() => router.push('/(tabs)/save')}
          accessibilityLabel="Explore yield vaults"
        >
          <View className="flex-1">
            <Text className="text-primary font-bold text-sm">Earn up to 14.8% APR</Text>
            <Text className="text-muted text-xs mt-0.5">Put idle savings to work →</Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="trending-up" size={20} color="#1A3C2B" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {selected && (
        <CircleDetail circle={selected} visible={!!selected} onClose={() => setSelected(null)} />
      )}
    </SafeAreaView>
  );
}

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-white/80 text-xs">{count} {label}</Text>
    </View>
  );
}
