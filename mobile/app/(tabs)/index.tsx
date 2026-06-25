import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WalletButton } from '../../components/WalletButton';
import { CircleCard } from '../../components/CircleCard';
import { CircleDetail } from '../../components/CircleDetail';
import { ProfileButton } from '../../components/ProfileSidebar';
import { useProfileSidebar } from '../../contexts/ProfileSidebarContext';
import { useCircles, type CircleData } from '../../hooks/useCircles';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName } from '../../hooks/useDisplayName';
import { useRefresh } from '../../hooks/useRefresh';

function fmtUSDC(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function HomeTab() {
  const router = useRouter();
  const { isConnected, connect, address } = useWallet();
  const { display } = useDisplayName(address);
  const { circles, isLoading } = useCircles();
  const { openSidebar } = useProfileSidebar();
  const { refreshing, refresh } = useRefresh();
  const [selected, setSelected] = React.useState<CircleData | null>(null);
  const [balanceHidden, setBalanceHidden] = React.useState(false);

  const totalSaved = circles.reduce((s, c) => s + c.poolBalance, 0n);
  const pendingPayouts = circles.filter((c) => c.payoutPending && c.myPosition === c.currentRound);
  const activeCount = circles.filter((c) => c.status === 1).length;

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* ── Top bar ── */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-xl bg-accent items-center justify-center">
            <Ionicons name="leaf" size={15} color="#1A3C2B" />
          </View>
          <Text className="text-white font-semibold text-xl tracking-tight">Rolla</Text>
          {display ? (
            <Text className="text-white/50 text-sm font-medium">· {display}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          <WalletButton />
          <ProfileButton onPress={openSidebar} />
        </View>
      </View>

      {/* ── Greeting ── */}
      <View className="px-5 pt-5 pb-7">
        <Text className="text-white/40 text-[11px] uppercase tracking-[2px] font-semibold mb-1.5">
          Total in Circles
        </Text>
        <View className="flex-row items-center gap-3 mb-5">
          <Text className="text-white text-5xl font-semibold tracking-tight leading-none">
            {balanceHidden ? '••••••' : `$${fmtUSDC(totalSaved)}`}
          </Text>
          <View className="gap-1.5">
            <TouchableOpacity onPress={() => setBalanceHidden((h) => !h)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name={balanceHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="white" />
            </TouchableOpacity>
            <View className="bg-white/10 rounded-md px-1.5 py-0.5">
              <Text className="text-white/50 text-xs font-bold">USDC</Text>
            </View>
          </View>
        </View>

        {/* Stat chips */}
        <View className="flex-row gap-2">
          <StatChip icon="radio-button-on" value={activeCount} label="Active" tint="#4ADE80" />
          <StatChip icon="gift-outline" value={pendingPayouts.length} label="Payout" tint="#D4A017" />
          <StatChip icon="people-circle-outline" value={circles.length} label="Circles" tint="rgba(255,255,255,0.55)" />
        </View>
      </View>

      {/* Main scroll area */}
      <ScrollView
        className="flex-1 bg-surface rounded-t-3xl"
        contentContainerClassName="px-4 pt-5 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1A3C2B" colors={['#1A3C2B']} />
        }
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
                Your payout is ready — claim ${fmtUSDC(pendingPayouts[0].poolBalance)} USDC from{' '}
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
              <Ionicons name="log-in-outline" size={30} color="#1A3C2B" />
            </View>
            <Text className="text-charcoal font-bold text-base">Sign in to get started</Text>
            <Text className="text-muted text-sm text-center px-6">
              Sign in with your social account to view your savings circles and start earning.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-full px-6 py-3 mt-1"
              onPress={connect}
            >
              <Text className="text-white font-bold">Sign in</Text>
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

function StatChip({
  icon, value, label, tint,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; value: number; label: string; tint: string }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/10">
      <Ionicons name={icon} size={11} color={tint} />
      <Text className="text-white font-bold text-xs">{value}</Text>
      <Text className="text-white/50 text-xs">{label}</Text>
    </View>
  );
}
