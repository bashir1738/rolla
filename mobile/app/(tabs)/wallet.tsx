import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { formatUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionItem, type TxType } from '../../components/TransactionItem';
import { useWallet } from '../../providers/WalletContext';
function fmtAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
import { ProfileButton } from '../../components/ProfileSidebar';
import { useProfileSidebar } from '../../contexts/ProfileSidebarContext';
import { TOKEN_ADDRESSES } from '../../constants/addresses';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import { SendSheet } from '../../components/SendSheet';

type Filter = 'All' | 'Payouts' | 'Contributions' | 'Vaults';
const FILTERS: Filter[] = ['All', 'Payouts', 'Contributions', 'Vaults'];
const FILTER_TYPES: Record<Filter, TxType[]> = {
  All:           ['payout', 'contribution', 'deposit', 'interest', 'claim', 'circle_create', 'circle_join'],
  Payouts:       ['payout', 'claim'],
  Contributions: ['contribution', 'circle_create', 'circle_join'],
  Vaults:        ['deposit', 'interest'],
};
const FILTER_ICONS: Record<Filter, React.ComponentProps<typeof Ionicons>['name']> = {
  All:           'list-outline',
  Payouts:       'cash-outline',
  Contributions: 'arrow-up-circle-outline',
  Vaults:        'leaf-outline',
};

// ── Token definitions ────────────────────────────────────────────────────────

interface TokenDef {
  symbol: string;
  name: string;
  tokenAddress?: `0x${string}`;
  bg: string;
  fg: string;
  label: string;
}

const TOKENS: TokenDef[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    tokenAddress: undefined,
    bg: '#627EEA',
    fg: '#fff',
    label: 'Ξ',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    tokenAddress: TOKEN_ADDRESSES.USDC,
    bg: '#2775CA',
    fg: '#fff',
    label: '$',
  },
];

// ── TokenRow ─────────────────────────────────────────────────────────────────

function TokenRow({
  token, walletAddress, isLast, refreshing,
}: { token: TokenDef; walletAddress: `0x${string}`; isLast: boolean; refreshing: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useBalance({
    address: walletAddress,
    token: token.tokenAddress,
    chainId: sepolia.id,
  });

  // Refetch balance when refreshing signal changes
  useEffect(() => {
    if (refreshing) {
      queryClient.invalidateQueries({
        queryKey: ['balance', { address: walletAddress, token: token.tokenAddress, chainId: sepolia.id }]
      });
    }
  }, [refreshing, walletAddress, token.tokenAddress, queryClient]);

  const formatted = data
    ? parseFloat(formatUnits(data.value, data.decimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: token.symbol === 'USDC' ? 2 : 5,
      })
    : '0.00';

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#EDE6D6',
      }}
    >
      {/* Token icon */}
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: token.bg, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: token.fg, fontSize: 16, fontWeight: '800' }}>{token.label}</Text>
      </View>

      {/* Name + symbol */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '600' }}>{token.name}</Text>
        <Text style={{ color: '#6B7C74', fontSize: 12, marginTop: 1 }}>{token.symbol} · Sepolia</Text>
      </View>

      {/* Balance */}
      <View style={{ alignItems: 'flex-end' }}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#1A3C2B" />
        ) : (
          <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '700' }}>{formatted}</Text>
        )}
        <Text style={{ color: '#6B7C74', fontSize: 11, marginTop: 1 }}>{token.symbol}</Text>
      </View>
    </View>
  );
}

// ── Assets section (ListHeader) ───────────────────────────────────────────────

function AssetsHeader({
  walletAddress, active, setActive, refreshing,
}: {
  walletAddress: `0x${string}`;
  active: Filter;
  setActive: (f: Filter) => void;
  refreshing: boolean;
}) {
  return (
    <>
      {/* Token list */}
      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EDE6D6', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
          <Ionicons name="layers-outline" size={13} color="#6B7C74" />
          <Text style={{ color: '#6B7C74', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Assets
          </Text>
        </View>
        {TOKENS.map((t, i) => (
          <TokenRow
            key={t.symbol}
            token={t}
            walletAddress={walletAddress}
            isLast={i === TOKENS.length - 1}
            refreshing={refreshing}
          />
        ))}
      </View>

      {/* Activity section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
        <Ionicons name="time-outline" size={13} color="#6B7C74" />
        <Text style={{ color: '#6B7C74', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          Activity
        </Text>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
              borderWidth: 1,
              backgroundColor: active === f ? '#1A3C2B' : '#F5F0E8',
              borderColor: active === f ? '#1A3C2B' : '#EDE6D6',
            }}
            onPress={() => setActive(f)}
          >
            <Ionicons name={FILTER_ICONS[f]} size={12} color={active === f ? '#FAF6EE' : '#6B7C74'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: active === f ? '#FAF6EE' : '#6B7C74' }}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function WalletTab() {
  const { isConnected, address, connect } = useWallet();
  const { openSidebar } = useProfileSidebar();
  const [active, setActive] = useState<Filter>('All');
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);

  const { txs, refresh: refreshTxs } = useTransactionHistory(address);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await refreshTxs();
    setRefreshing(false);
  };

  const filtered = useMemo(
    () => txs.filter((tx) => FILTER_TYPES[active].includes(tx.type)),
    [txs, active],
  );

  const copyAddress = () => {
    if (!address) return;
    Share.share({ message: address }).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="bg-primary px-5 pt-3 pb-6">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-white text-2xl font-semibold">Wallet</Text>
            <Text className="text-white/60 text-sm mt-1">
              {isConnected ? 'Your on-chain activity' : 'Connect to get started'}
            </Text>
          </View>
          <ProfileButton onPress={openSidebar} />
        </View>

        {isConnected && address && (
          <>
            <TouchableOpacity
              onPress={copyAddress}
              className="flex-row items-center gap-3 mt-4 bg-white/10 rounded-2xl px-4 py-3"
              accessibilityLabel="Copy wallet address"
            >
              <View className="w-8 h-8 rounded-full bg-accent/20 items-center justify-center">
                <Ionicons name="wallet-outline" size={16} color="#D4A017" />
              </View>
              <Text className="flex-1 text-white font-medium text-sm font-mono" numberOfLines={1}>
                {fmtAddr(address)}
              </Text>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? '#4ADE80' : 'rgba(255,255,255,0.5)'}
              />
            </TouchableOpacity>

            {/* Quick actions */}
            <View className="flex-row gap-3 mt-3">
              <TouchableOpacity
                onPress={() => setShowSend(true)}
                className="flex-1 flex-row items-center justify-center gap-2 bg-white/15 rounded-2xl py-3 border border-white/20"
              >
                <Ionicons name="arrow-up-outline" size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm">Send</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={copyAddress}
                className="flex-1 flex-row items-center justify-center gap-2 bg-white/15 rounded-2xl py-3 border border-white/20"
              >
                <Ionicons name={copied ? 'checkmark' : 'arrow-down-outline'} size={16} color={copied ? '#4ADE80' : '#fff'} />
                <Text className={copied ? 'text-green-400 font-semibold text-sm' : 'text-white font-semibold text-sm'}>
                  {copied ? 'Copied!' : 'Receive'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View className="flex-1 bg-surface rounded-t-3xl overflow-hidden">
        {!isConnected ? (
          <EmptyState
            icon="wallet-outline"
            title="Connect your wallet"
            subtitle="Sign in to see your balances and transaction history."
            action={{ label: 'Sign in', onPress: connect }}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(tx) => tx.id}
            renderItem={({ item }) => <TransactionItem tx={item} />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1A3C2B" colors={['#1A3C2B']} />
            }
            ListHeaderComponent={
              <AssetsHeader
                walletAddress={address!}
                active={active}
                setActive={setActive}
                refreshing={refreshing}
              />
            }
            contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
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

      <SendSheet visible={showSend} onClose={() => setShowSend(false)} />
    </SafeAreaView>
  );
}

function EmptyState({
  icon, title, subtitle, action,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10 py-10">
      <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={30} color="#1A3C2B" />
      </View>
      <Text className="text-charcoal font-bold text-base">{title}</Text>
      <Text className="text-muted text-sm text-center">{subtitle}</Text>
      {action && (
        <TouchableOpacity className="bg-primary rounded-full px-6 py-3 mt-1" onPress={action.onPress}>
          <Text className="text-white font-bold">{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
