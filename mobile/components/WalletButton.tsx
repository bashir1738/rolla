import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../providers/WalletContext';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full border border-white/20"
        onPress={disconnect}
        accessibilityLabel={`Connected wallet ${address}`}
      >
        <View className="w-2 h-2 rounded-full bg-green-400" />
        <Text className="text-white text-xs font-semibold">{shortAddr(address)}</Text>
        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-1.5 border border-accent px-3 py-1.5 rounded-full"
      onPress={connect}
      accessibilityLabel="Connect wallet"
    >
      <Ionicons name="wallet-outline" size={14} color="#D4A017" />
      <Text className="text-accent text-xs font-semibold">Connect</Text>
    </TouchableOpacity>
  );
}
