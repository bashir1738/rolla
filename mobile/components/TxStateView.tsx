import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TxState } from '../providers/WalletContext';

interface Props {
  txState: TxState;
  txHash?: string | null;
  error?: string | null;
  successMessage?: string;
  onReset: () => void;
}

export function TxStateView({ txState, txHash, error, successMessage, onReset }: Props) {
  if (txState === 'idle') return null;

  return (
    <View className="items-center py-6 gap-3 px-4">
      {txState === 'signing' && (
        <>
          <ActivityIndicator size="large" color="#1A3C2B" />
          <Text className="text-charcoal font-semibold text-base text-center">
            Waiting for wallet signature…
          </Text>
          <Text className="text-muted text-sm">Approve in your wallet</Text>
        </>
      )}

      {txState === 'confirming' && (
        <>
          <ActivityIndicator size="large" color="#D4A017" />
          <Text className="text-charcoal font-semibold text-base text-center">
            Confirming on-chain…
          </Text>
          <Text className="text-muted text-sm">This takes ~15 seconds</Text>
        </>
      )}

      {txState === 'success' && (
        <>
          <View className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 items-center justify-center">
            <Ionicons name="checkmark-circle" size={40} color="#4ADE80" />
          </View>
          <Text className="text-primary font-black text-lg text-center">
            {successMessage ?? 'Transaction confirmed!'}
          </Text>
          {txHash && (
            <View className="flex-row items-center gap-1.5 bg-surface rounded-xl px-3 py-2">
              <Ionicons name="link-outline" size={13} color="#6B7C74" />
              <Text className="text-muted text-xs font-mono">
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            className="mt-1 bg-primary rounded-full px-8 py-3"
            onPress={onReset}
            accessibilityLabel="Close"
          >
            <Text className="text-white font-bold">Done</Text>
          </TouchableOpacity>
        </>
      )}

      {txState === 'error' && (
        <>
          <View className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 items-center justify-center">
            <Ionicons name="close-circle" size={40} color="#C1440E" />
          </View>
          <Text className="text-alert font-semibold text-center px-4">
            {error ?? 'Transaction failed'}
          </Text>
          <TouchableOpacity
            className="bg-alert rounded-full px-8 py-3"
            onPress={onReset}
            accessibilityLabel="Try again"
          >
            <Text className="text-white font-bold">Try again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
