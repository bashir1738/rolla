import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TxType = 'payout' | 'contribution' | 'deposit' | 'interest' | 'claim';

export interface Transaction {
  id: string;
  type: TxType;
  label: string;
  subLabel?: string;
  date: Date;
  amountUSDT: bigint;
  txHash?: string;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_META: Record<TxType, { icon: IoniconsName; iconColor: string; incoming: boolean; bg: string }> = {
  payout:       { icon: 'cash-outline',          iconColor: '#1A3C2B', incoming: true,  bg: '#E8F5EE' },
  contribution: { icon: 'arrow-up-circle-outline',iconColor: '#C1440E', incoming: false, bg: '#FDF0EC' },
  deposit:      { icon: 'wallet-outline',         iconColor: '#1A3C2B', incoming: false, bg: '#E8F5EE' },
  interest:     { icon: 'trending-up-outline',    iconColor: '#D4A017', incoming: true,  bg: '#FFF9E6' },
  claim:        { icon: 'gift-outline',           iconColor: '#1A3C2B', incoming: true,  bg: '#E8F5EE' },
};

function fmtUSDT(v: bigint) {
  return (Number(v < 0n ? -v : v) / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TransactionItem({ tx }: { tx: Transaction }) {
  const meta = TYPE_META[tx.type];

  return (
    <View
      className="flex-row items-center px-4 py-3 bg-card border-b border-border"
      accessibilityLabel={`${tx.label} ${fmtUSDT(tx.amountUSDT)} USDT`}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: meta.bg }}
      >
        <Ionicons name={meta.icon} size={20} color={meta.iconColor} />
      </View>

      <View className="flex-1">
        <Text className="text-charcoal font-semibold text-sm" numberOfLines={1}>
          {tx.label}
        </Text>
        {tx.subLabel && (
          <Text className="text-muted text-xs mt-0.5">{tx.subLabel}</Text>
        )}
        <Text className="text-muted text-xs mt-0.5">{fmtDate(tx.date)}</Text>
      </View>

      <View className="items-end gap-0.5">
        <Text
          className={`font-bold text-sm ${meta.incoming ? 'text-primary' : 'text-alert'}`}
        >
          {meta.incoming ? '+' : '-'}${fmtUSDT(tx.amountUSDT)}
        </Text>
        {tx.txHash && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="link-outline" size={10} color="#6B7C74" />
            <Text className="text-muted text-[10px]">Etherscan</Text>
          </View>
        )}
      </View>
    </View>
  );
}
