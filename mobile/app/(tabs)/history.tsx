import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TransactionItem, type Transaction, type TxType } from '../../components/TransactionItem';
import { useWallet } from '../../providers/WalletContext';

// On-chain activity feed. Transactions are sourced from contract events; until an
// indexer is wired up this starts empty and fills as the wallet transacts.
const TRANSACTIONS: Transaction[] = [];

type Filter = 'All' | 'Payouts' | 'Contributions' | 'Vaults';
const FILTERS: Filter[] = ['All', 'Payouts', 'Contributions', 'Vaults'];
const FILTER_TYPES: Record<Filter, TxType[]> = {
  All:           ['payout', 'contribution', 'deposit', 'interest', 'claim'],
  Payouts:       ['payout', 'claim'],
  Contributions: ['contribution'],
  Vaults:        ['deposit', 'interest'],
};
const FILTER_ICONS: Record<Filter, React.ComponentProps<typeof Ionicons>['name']> = {
  All:           'list-outline',
  Payouts:       'cash-outline',
  Contributions: 'arrow-up-circle-outline',
  Vaults:        'leaf-outline',
};

export default function HistoryTab() {
  const { isConnected } = useWallet();
  const [active, setActive] = useState<Filter>('All');

  const filtered = useMemo(
    () => TRANSACTIONS.filter((tx) => FILTER_TYPES[active].includes(tx.type)),
    [active],
  );

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="bg-primary px-5 pt-3 pb-6">
        <Text className="text-white text-2xl font-black">History</Text>
        <Text className="text-white/60 text-sm mt-1">
          {isConnected ? `${filtered.length} transactions` : 'Your on-chain activity'}
        </Text>
      </View>

      <View className="flex-1 bg-surface rounded-t-3xl overflow-hidden">
      {/* Filter chips */}
      <View className="flex-row gap-2 px-4 py-3 pt-4">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
              active === f ? 'bg-primary border-primary' : 'bg-card border-border'
            }`}
            onPress={() => setActive(f)}
            accessibilityLabel={`Filter: ${f}`}
          >
            <Ionicons name={FILTER_ICONS[f]} size={13} color={active === f ? '#FAF6EE' : '#6B7C74'} />
            <Text className={`text-xs font-semibold ${active === f ? 'text-surface' : 'text-muted'}`}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isConnected ? (
        <EmptyState
          icon="wallet-outline"
          title="Connect your wallet"
          subtitle="Your transaction history will appear here once connected."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => <TransactionItem tx={item} />}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Contributions, payouts and vault activity will show up here."
            />
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

function EmptyState({
  icon, title, subtitle,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10">
      <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={30} color="#1A3C2B" />
      </View>
      <Text className="text-charcoal font-bold text-base">{title}</Text>
      <Text className="text-muted text-sm text-center">{subtitle}</Text>
    </View>
  );
}
